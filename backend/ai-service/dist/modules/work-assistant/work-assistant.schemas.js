"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageSchema = exports.createSessionSchema = exports.sessionsSchema = exports.sessionSchema = exports.overviewSchema = exports.querySchema = exports.scopeSchema = void 0;
const zod_1 = require("zod");
const work_time_1 = require("./work-time");
exports.scopeSchema = zod_1.z
    .object({
    projectId: zod_1.z.string().uuid().optional(),
    audience: zod_1.z.enum(["mine", "project"]).default("mine"),
})
    .strict()
    .refine((s) => !!s.projectId || s.audience === "mine", "Project scope required");
exports.querySchema = zod_1.z
    .object({
    projectId: zod_1.z.string().uuid().optional(),
    before: zod_1.z.string().uuid().optional(),
})
    .strict();
exports.overviewSchema = exports.scopeSchema.safeExtend({
    timeZone: work_time_1.timeZoneSchema.optional(),
});
exports.sessionSchema = exports.querySchema.extend({
    sessionId: zod_1.z.string().uuid().optional(),
});
exports.sessionsSchema = exports.querySchema.extend({
    before: zod_1.z.string().min(1).max(512).optional(),
});
exports.createSessionSchema = zod_1.z
    .object({ projectId: zod_1.z.string().uuid().optional() })
    .strict();
exports.messageSchema = zod_1.z
    .object({
    question: zod_1.z.string().trim().min(1).max(4000),
    requestId: zod_1.z.string().uuid(),
    audience: zod_1.z.enum(["mine", "project"]).default("mine"),
    timeZone: work_time_1.timeZoneSchema.optional(),
})
    .strict();
