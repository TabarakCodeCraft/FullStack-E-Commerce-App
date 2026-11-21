import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),

    PORT: z.coerce.number().int().positive().default(3001),

    DATABASE_URL: z.string().url(),

    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().optional(),

    FRONTEND_URL: z.string().url(),

    POLAR_ACCESS_TOKEN: z.string().optional(),
    POLAR_WEBHOOK_SECRET: z.string().optional(),
    POLAR_API_BASE: z.string().url().default("https://api.polar.sh"),
    POLAR_CHECKOUT_PRODUCT_ID: z.string().optional(),

    STREAM_API_KEY: z.string().min(1),
    STREAM_API_SECRET: z.string().min(1),

    IMAGEKIT_PUBLIC_KEY: z.string().min(1),
    IMAGEKIT_PRIVATE_KEY: z.string().min(1),
    IMAGEKIT_URL_ENDPOINT: z.string().url(),

    SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
    if (cachedEnv) return cachedEnv;

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error(
            "Invalid environment variables:",
            result.error.flatten().fieldErrors
        );

        throw new Error("Invalid environment variables");
    }

    cachedEnv = result.data;

    return cachedEnv;
}