import "dotenv/config";
import express from "express";
import cors from "cors";

import fs from "node:fs";
import path from "node:path";

import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhooks/clerk";
import { getEnv } from "./lib/env";

const env = getEnv();
const app = express();

const publicDir = path.join(process.cwd(), "public");

app.use(cors());

app.post(
    "/webhooks/clerk",
    express.raw({
        type: "application/json",
        limit: "1mb",
    }),
    (req, res) => {
        void clerkWebhookHandler(req, res);
    }
);

app.use(express.json());
app.use(clerkMiddleware());


app.get("/api", (_req, res) => {
    res.json({ status: "ok", message: "API Tabarak its running" });
});

if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));

    app.get("/{*splat}", (req, res, next) => {
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
});