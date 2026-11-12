import "dotenv/config";
import { z } from "zod";

export const config = z
  .object({
    USER_SERVICE_URL: z.string().url().default("http://localhost:8081"),
    AI_TO_USER_KEY: z.string().trim().default(""),
    JWT_SECRET_KEY: z.string().default(""),
    JWT_ISSUER: z.string().trim().min(1).default("workspace-hub"),
    MEETING_STT_URL: z.string().url().default("http://127.0.0.1:8090"),
    MEETING_STT_SERVICE_KEY: z.string().default(""),
    MEETING_STT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(600000)
      .default(180000),
    MEETING_SUMMARY_ENABLED: z.enum(["true", "false"]).default("false"),
    VOICE_TRANSCRIPTION_ENABLED: z
      .enum(["true", "false"])
      .default(
        process.env.MEETING_SUMMARY_ENABLED === "true" ? "true" : "false",
      ),
    MEETING_SUMMARY_MAX_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(14400)
      .default(7200),
    MEETING_SUMMARY_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1048576)
      .max(2147483648)
      .default(1073741824),
    MEETING_FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
    MEETING_MEDIA_HOSTS: z.string().default(""),
    CONVERSATION_AI_ENABLED: z.enum(["true", "false"]).default("false"),
    CONVERSATION_AI_CONCURRENCY: z.coerce
      .number()
      .int()
      .min(1)
      .max(8)
      .default(2),
    LLM_QUOTA_WAIT_MS: z.coerce.number().int().min(0).max(60000).default(60000),
    CONVERSATION_AI_MODEL: z.string().trim().min(1).optional(),
    CONVERSATION_AI_MAX_TOKENS: z.coerce
      .number()
      .int()
      .min(256)
      .max(8192)
      .optional(),
    WORK_ASSISTANT_MODEL: z.string().trim().min(1).optional(),
    WORK_ASSISTANT_MAX_TOKENS: z.coerce
      .number()
      .int()
      .min(256)
      .max(2200)
      .default(1800),
    MEETING_SUMMARY_MODEL: z.string().trim().min(1).optional(),
    MEETING_SUMMARY_MAX_TOKENS: z.coerce
      .number()
      .int()
      .min(256)
      .max(8192)
      .optional(),
    AI_TO_COMMUNICATION_KEY: z.string().default(""),
    COMMUNICATION_TO_AI_KEY: z.string().default(""),
    COMMUNICATION_SERVICE_URL: z
      .string()
      .url()
      .default("http://localhost:8083"),
    WORK_ASSISTANT_ENABLED: z.enum(["true", "false"]).default("true"),
    AI_TO_PROJECT_KEY: z.string().default(""),
    AI_TO_CALENDAR_KEY: z.string().default(""),
    WORK_ASSISTANT_PROJECT_URL: z
      .string()
      .url()
      .default("http://localhost:8082"),
    WORK_ASSISTANT_CALENDAR_URL: z
      .string()
      .url()
      .default("http://localhost:8086"),
    PORT: z.coerce.number().default(8087),
    AI_ENABLED: z.enum(["true", "false"]).default("false"),
    AI_SHUTDOWN_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(900000)
      .default(210000),
    CHAT_CANCEL_POLL_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(10000)
      .default(2000),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    BIND_HOST: z.string().default("127.0.0.1"),
    DATABASE_URL: z.string().min(1),
    NOTEBOOK_INDEX_CONCURRENCY: z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .default(1),
    NOTEBOOK_INDEX_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(30000)
      .max(1800000)
      .default(240000),
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
    VISUAL_ENABLED: z.enum(["true", "false"]).default("false"),
    VISION_MAX_TOKENS: z.coerce.number().int().min(512).max(4096).default(2048),
    VISION_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(3),
    LLM_TIMEOUT_MS: z.coerce.number().min(1000).max(120000).default(90000),
    LLM_MAX_TOKENS: z.coerce.number().int().min(256).max(10000).default(4096),
    LLM_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).default(5),
    LLM_TOKENS_PER_MINUTE: z.coerce.number().int().min(1000).default(20000),
    LLM_REQUESTS_PER_DAY: z.coerce.number().int().min(1).default(100),
    LLM_INTERACTIVE_RESERVE_PER_DAY: z.coerce.number().int().min(0).default(50),
  })
  .superRefine((value, context) => {
    if (
      (value.MEETING_SUMMARY_ENABLED === "true" ||
        value.VOICE_TRANSCRIPTION_ENABLED === "true") &&
      (!value.MEETING_MEDIA_HOSTS ||
        value.MEETING_STT_SERVICE_KEY.length < 32 ||
        value.AI_TO_COMMUNICATION_KEY.length < 32 ||
        value.COMMUNICATION_TO_AI_KEY.length < 32)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MEETING_SUMMARY_ENABLED"],
        message:
          "Configure local speech service key, allowed media hosts and communication service key",
      });
    if (
      value.VISUAL_ENABLED === "true" &&
      new URL(value.LLM_BASE_URL).origin !== "https://vibi.top"
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["LLM_BASE_URL"],
        message: "Visual data egress is approved only for https://vibi.top",
      });
    if (
      value.CONVERSATION_AI_ENABLED === "true" &&
      (value.AI_TO_COMMUNICATION_KEY.length < 32 ||
        value.COMMUNICATION_TO_AI_KEY.length < 32)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AI_TO_COMMUNICATION_KEY"],
        message: "Configure a dedicated communication key",
      });
    if (value.AI_ENABLED !== "true") return;
    for (const name of [
      "AI_GATEWAY_KEY",
      "AI_DOCUMENT_SERVICE_KEY",
      "RAG_SERVICE_KEY",
      "AI_TO_USER_KEY",
      "JWT_SECRET_KEY",
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
