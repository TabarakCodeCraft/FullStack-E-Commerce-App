import "dotenv/config";
import express from "express";
import cors from "cors";

import fs from "node:fs";
import path from "node:path";

import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhooks/clerk";
import { getEnv } from "./lib/env";
import keepAliveCron from "./lib/cron";
import meRouter from "./routes/meRouter"
import productRouter from "./routes/producetRouter";
import streamRouter from "./routes/streamRouter";
import checkoutRouter from "./routes/checkoutRouter";
import {polarWebhookHandler} from "./webhooks/polar";

const env = getEnv();
const app = express();


const publicDir = path.join(process.cwd(), "public");

const rawJson = express.raw({ type: "application/json", limit: "1mb" });


app.post("/webhooks/clerk", rawJson, (req, res) => {
  void clerkWebhookHandler(req, res);
});

app.post("/webhooks/polar", rawJson, (req, res) => {
  void polarWebhookHandler(req, res);
});

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());


app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.use("/api/me", meRouter);
app.use("/api/products", productRouter);
app.use("/api/stream", streamRouter);
app.use("/api/checkout", checkoutRouter);

if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));

    app.get("/{*any}", (req, res, next) => {
        if (
            req.path.startsWith("/api/") ||
            req.path === "/api" ||
            req.path.startsWith("/webhooks/")
        ) {
            return next();
        }

        if (req.method !== "GET" && req.method !== "HEAD") {
            return next();
        }

        res.sendFile(path.join(publicDir, "index.html"), (err) => {
            if (err) next(err);
        });
    });
}

app.listen(env.PORT, () => {
    console.log(`Server listening on port: ${env.PORT}`);
    if (env.NODE_ENV === "production") {
        keepAliveCron.start();
    }
});