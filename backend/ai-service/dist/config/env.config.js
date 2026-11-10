"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connection = exports.config = void 0;
require("dotenv/config");
const zod_1 = require("zod");
exports.config = zod_1.z
    .object({
    MEETING_STT_CONCURRENCY: zod_1.z.coerce.number().int().min(1).max(4).default(1),
    MEETING_STT_URL: zod_1.z.string().url().default("http://127.0.0.1:8090"),
    MEETING_STT_SERVICE_KEY: zod_1.z.string().default(""),
    MEETING_STT_TIMEOUT_MS: zod_1.z.coerce
        .number()
        .int()
        .min(1000)
        .max(600000)
        .default(180000),
    MEETING_SUMMARY_ENABLED: zod_1.z.enum(["true", "false"]).default("false"),
    MEETING_SUMMARY_MAX_SECONDS: zod_1.z.coerce
        .number()
        .int()
        .min(60)
        .max(14400)
        .default(7200),
    MEETING_SUMMARY_MAX_BYTES: zod_1.z.coerce
        .number()
        .int()
        .min(1048576)
        .max(2147483648)
        .default(1073741824),
    MEETING_FFMPEG_PATH: zod_1.z.string().min(1).default("ffmpeg"),
    MEETING_MEDIA_HOSTS: zod_1.z.string().default(""),
    CONVERSATION_AI_ENABLED: zod_1.z.enum(["true", "false"]).default("false"),
    CONVERSATION_AI_CONCURRENCY: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(8)
        .default(2),
    CONVERSATION_AI_QUOTA_WAIT_MS: zod_1.z.coerce
        .number()
        .int()
        .min(0)
        .max(60000)
        .default(60000),
    CONVERSATION_AI_MODEL: zod_1.z.string().trim().min(1).optional(),
    CONVERSATION_AI_MAX_TOKENS: zod_1.z.coerce
        .number()
        .int()
        .min(256)
        .max(8192)
        .optional(),
    AI_COMMUNICATION_SERVICE_KEY: zod_1.z.string().default(""),
    COMMUNICATION_SERVICE_URL: zod_1.z
        .string()
        .url()
        .default("http://localhost:8083"),
    WORK_ASSISTANT_ENABLED: zod_1.z.enum(["true", "false"]).default("true"),
    WORK_ASSISTANT_SERVICE_KEY: zod_1.z.string().default(""),
    WORK_ASSISTANT_PROJECT_URL: zod_1.z
        .string()
        .url()
        .default("http://localhost:8082"),
    WORK_ASSISTANT_CALENDAR_URL: zod_1.z
        .string()
        .url()
        .default("http://localhost:8086"),
    PORT: zod_1.z.coerce.number().default(8087),
    AI_ENABLED: zod_1.z.enum(["true", "false"]).default("false"),
    AI_SHUTDOWN_TIMEOUT_MS: zod_1.z.coerce
        .number()
        .int()
        .min(1000)
        .max(900000)
        .default(210000),
    CHAT_CANCEL_POLL_MS: zod_1.z.coerce
        .number()
        .int()
        .min(500)
        .max(10000)
        .default(2000),
    NODE_ENV: zod_1.z
        .enum(["development", "test", "production"])
        .default("development"),
    BIND_HOST: zod_1.z.string().default("127.0.0.1"),
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().url(),
    AI_GATEWAY_KEY: zod_1.z.string().trim().default(""),
    AI_GATEWAY_KEY_PREVIOUS: zod_1.z.string().trim().default(""),
    AI_DOCUMENT_SERVICE_KEY: zod_1.z.string().trim().default(""),
    RAG_SERVICE_KEY: zod_1.z.string().trim().default(""),
    DOCUMENT_SERVICE_URL: zod_1.z.string().url(),
    RAG_WORKER_URL: zod_1.z.string().url(),
    FRONTEND_URL: zod_1.z.string().url().default("http://localhost:3000"),
    LLM_BASE_URL: zod_1.z.string().url(),
    LLM_API_KEY: zod_1.z.string().min(1),
    LLM_MODEL: zod_1.z.string().min(1),
    VISUAL_ENABLED: zod_1.z.enum(["true", "false"]).default("false"),
    VISION_MAX_TOKENS: zod_1.z.coerce.number().int().min(512).max(4096).default(2048),
    LLM_TIMEOUT_MS: zod_1.z.coerce.number().min(1000).max(120000).default(90000),
    LLM_MAX_TOKENS: zod_1.z.coerce.number().int().min(256).max(8192).default(4096),
    LLM_REQUESTS_PER_MINUTE: zod_1.z.coerce.number().int().min(1).default(5),
    LLM_TOKENS_PER_MINUTE: zod_1.z.coerce.number().int().min(1000).default(20000),
    LLM_REQUESTS_PER_DAY: zod_1.z.coerce.number().int().min(1).default(100),
})
    .superRefine((value, context) => {
    if (value.MEETING_SUMMARY_ENABLED === "true" &&
        value.MEETING_STT_CONCURRENCY !== 1)
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["MEETING_STT_CONCURRENCY"],
            message: "Local speech worker supports one audio chunk at a time; configure MEETING_STT_CONCURRENCY=1",
        });
    if (value.MEETING_SUMMARY_ENABLED === "true" &&
        (!value.MEETING_MEDIA_HOSTS ||
            value.MEETING_STT_SERVICE_KEY.length < 32 ||
            value.AI_COMMUNICATION_SERVICE_KEY.length < 32))
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["MEETING_SUMMARY_ENABLED"],
            message: "Configure local speech service key, allowed media hosts and communication service key",
        });
    if (value.VISUAL_ENABLED === "true" &&
        new URL(value.LLM_BASE_URL).origin !== "https://vibi.top")
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["LLM_BASE_URL"],
            message: "Visual data egress is approved only for https://vibi.top",
        });
    if (value.CONVERSATION_AI_ENABLED === "true" &&
        value.AI_COMMUNICATION_SERVICE_KEY.length < 32)
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["AI_COMMUNICATION_SERVICE_KEY"],
            message: "Configure a dedicated communication key",
        });
    if (value.AI_ENABLED !== "true")
        return;
    for (const name of [
        "AI_GATEWAY_KEY",
        "AI_DOCUMENT_SERVICE_KEY",
        "RAG_SERVICE_KEY",
    ]) {
        if (value[name].length < 32)
            context.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                path: [name],
                message: "Configure a dedicated service key (at least 32 characters)",
            });
    }
    if (value.AI_GATEWAY_KEY_PREVIOUS &&
        value.AI_GATEWAY_KEY_PREVIOUS.length < 32)
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["AI_GATEWAY_KEY_PREVIOUS"],
            message: "Invalid previous gateway key",
        });
})
    .parse(process.env);
const redis = new URL(exports.config.REDIS_URL);
exports.connection = {
    host: redis.hostname,
    port: Number(redis.port || 6379),
    password: redis.password ? decodeURIComponent(redis.password) : undefined,
    username: redis.username ? decodeURIComponent(redis.username) : undefined,
    db: Number(redis.pathname.slice(1) || 0),
    ...(redis.protocol === "rediss:" ? { tls: {} } : {}),
};
