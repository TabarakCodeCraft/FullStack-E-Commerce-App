
import type { Request, Response } from "express";
import { getEnv } from "../lib/env.js";
import {
    checkoutSessions,
    orderItems,
    orders,
} from "../db/schema.js";
import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { Webhook } from "standardwebhooks";

function headerString(
    headers: Request["headers"],
    name: string
): string | undefined {
    const value = headers[name];

    return Array.isArray(value) ? value[0] : value;
}

function checkoutSessionIdFromMetadata(
    order: Record<string, unknown>
): string | undefined {
    const metadata = order.metadata;

    if (!metadata || typeof metadata !== "object") {
        return undefined;
    }

    const sessionId = (
        metadata as Record<string, unknown>
    ).checkout_session_id;

    return typeof sessionId === "string"
        ? sessionId
        : undefined;
}

async function alreadyPaid(
    polarOrderId?: string,
    checkoutId?: string
): Promise<boolean> {
    const conditions = [];

    if (polarOrderId) {
        conditions.push(eq(orders.polarOrderId, polarOrderId));
    }

    if (checkoutId) {
        conditions.push(eq(orders.polarCheckoutId, checkoutId));
    }

    if (!conditions.length) return false;

    const [row] = await db
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(or(...conditions))
        .limit(1);

    return row?.status === "paid";
}

async function fulfillCheckoutSession(
    sessionId: string,
    polarOrderId?: string,
    checkoutId?: string
): Promise<boolean> {
    return db.transaction(async (tx) => {
        const [session] = await tx
            .select()
            .from(checkoutSessions)
            .where(eq(checkoutSessions.id, sessionId))
            .for("update");

        if (!session) return false;

        const conditions = [];

        if (polarOrderId) {
            conditions.push(
                eq(orders.polarOrderId, polarOrderId)
            );
        }

        if (checkoutId) {
            conditions.push(
                eq(orders.polarCheckoutId, checkoutId)
            );
        }

        if (conditions.length) {
            const [existingOrder] = await tx
                .select({ id: orders.id })
                .from(orders)
                .where(or(...conditions))
                .limit(1);

            if (existingOrder) return true;
        }

        const [order] = await tx
            .insert(orders)
            .values({
                userId: session.userId,
                status: "paid",
                totalCents: session.totalCents,
                polarCheckoutId:
                    checkoutId ??
                    session.polarCheckoutId ??
                    null,
                ...(polarOrderId
                    ? { polarOrderId }
                    : {}),
            })
            .returning();

        if (!order) {
            throw new Error("Failed to create order");
        }

        if (session.lines.length > 0) {
            await tx.insert(orderItems).values(
                session.lines.map((line) => ({
                    orderId: order.id,
                    productId: line.productId,
                    quantity: line.quantity,
                    unitPriceCents: line.unitPriceCents,
                }))
            );
        }

        await tx
            .delete(checkoutSessions)
            .where(eq(checkoutSessions.id, sessionId));

        return true;
    });
}

export async function polarWebhookHandler(
    req: Request,
    res: Response
) {
    try {
        const env = getEnv();

        if (!env.POLAR_WEBHOOK_SECRET) {
            res.status(503).send(
                "Polar webhooks not configured"
            );
            return;
        }

        if (!Buffer.isBuffer(req.body)) {
            res.status(400).json({
                error: "Expected raw webhook body",
            });
            return;
        }

        const raw = req.body;

        const id = headerString(req.headers, "webhook-id");
        const timestamp = headerString(
            req.headers,
            "webhook-timestamp"
        );
        const signature = headerString(
            req.headers,
            "webhook-signature"
        );

        if (!id || !timestamp || !signature) {
            res.status(400).json({
                error: "Missing webhook headers",
            });
            return;
        }

        const wh = new Webhook(env.POLAR_WEBHOOK_SECRET);

        wh.verify(raw, {
            "webhook-id": id,
            "webhook-timestamp": timestamp,
            "webhook-signature": signature,
        });

        const event = JSON.parse(raw.toString("utf8")) as {
            type: string;
            data?: Record<string, unknown>;
        };

        if (event.type !== "order.paid" || !event.data) {
            res.json({ ok: true });
            return;
        }

        const data = event.data;

        const polarOrderId =
            typeof data.id === "string"
                ? data.id
                : undefined;

        const checkoutId =
            typeof data.checkout_id === "string"
                ? data.checkout_id
                : undefined;

        const sessionId =
            checkoutSessionIdFromMetadata(data);

        if (!sessionId) {
            console.error(
                "Polar order.paid: missing checkout session metadata",
                { polarOrderId, checkoutId }
            );

            res.status(500).json({
                error: "Missing checkout session metadata",
            });
            return;
        }

        if (
            await alreadyPaid(polarOrderId, checkoutId)
        ) {
            res.json({
                ok: true,
                duplicate: true,
            });
            return;
        }

        const fulfilled = await fulfillCheckoutSession(
            sessionId,
            polarOrderId,
            checkoutId
        );

        if (!fulfilled) {
            console.error(
                "Polar order.paid: checkout session not found",
                { sessionId, checkoutId }
            );

            res.status(500).json({
                error: "Checkout fulfillment failed",
            });
            return;
        }

        res.json({ ok: true });

    } catch (error) {
        console.error("Polar webhook error:", error);

        res.status(400).json({
            error: "Invalid webhook",
        });
    }
}
