import "dotenv/config";
import { z } from "zod";

export const config = z
  .object({
    PORT: z.coerce.number().default(8087),
    AI_ENABLED: z.enum(["true", "false"]).default("false"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    BIND_HOST: z.string().default("127.0.0.1"),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url(),
    AI_GATEWAY_KEY: z.string().trim().default(""),
    AI_GATEWAY_KEY_PREVIOUS: z.string().trim().default(""),
    AI_DOCUMENT_SERVICE_KEY: z.string().trim().default(""),
    RAG_SERVICE_KEY: z.string().trim().default(""),
    DOCUMENT_SERVICE_URL: z.string().url(),
    RAG_WORKER_URL: z.string().url(),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    LLM_BASE_URL: z.string().url(),
    LLM_API_KEY: z.string().min(1),
    LLM_MODEL: z.string().min(1),
    LLM_TIMEOUT_MS: z.coerce.number().min(1000).max(120000).default(45000),
    LLM_MAX_TOKENS: z.coerce.number().int().min(256).max(8192).default(1600),
    LLM_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).default(5),
    LLM_TOKENS_PER_MINUTE: z.coerce.number().int().min(1000).default(20000),
    LLM_REQUESTS_PER_DAY: z.coerce.number().int().min(1).default(100),
  })
  .superRefine((value, context) => {
    if (value.AI_ENABLED !== "true") return;
    for (const name of [
      "AI_GATEWAY_KEY",
      "AI_DOCUMENT_SERVICE_KEY",
      "RAG_SERVICE_KEY",
    ] as const) {
      if (value[name].length < 32)
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [name],
          message: "Configure a dedicated service key (at least 32 characters)",
        });
    }
    if (
      value.AI_GATEWAY_KEY_PREVIOUS &&
      value.AI_GATEWAY_KEY_PREVIOUS.length < 32
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_GATEWAY_KEY_PREVIOUS"],
        message: "Invalid previous gateway key",
      });
  })
  .parse(process.env);

const redis = new URL(config.REDIS_URL);
export const connection = {
  host: redis.hostname,
  port: Number(redis.port || 6379),
  password: redis.password ? decodeURIComponent(redis.password) : undefined,
  username: redis.username ? decodeURIComponent(redis.username) : undefined,
  db: Number(redis.pathname.slice(1) || 0),
  ...(redis.protocol === "rediss:" ? { tls: {} } : {}),
};
