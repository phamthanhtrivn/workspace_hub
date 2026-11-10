"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkContextService = void 0;
exports.rankTasks = rankTasks;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const env_config_1 = require("../../config/env.config");
const read_response_1 = require("../../common/read-response");
const work_time_1 = require("./work-time");
const metricsSchema = zod_1.z.object({
    open: zod_1.z.number().int().nonnegative(),
    overdue: zod_1.z.number().int().nonnegative(),
    dueToday: zod_1.z.number().int().nonnegative(),
    completedInPeriod: zod_1.z.number().int().nonnegative(),
    completedWithDeadline: zod_1.z.number().int().nonnegative(),
    onTime: zod_1.z.number().int().nonnegative(),
    late: zod_1.z.number().int().nonnegative(),
    onTimeRate: zod_1.z.number().min(0).max(1).nullable(),
    deadlineBasis: zod_1.z.string(),
    total: zod_1.z.number().optional(),
    byStatus: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
});
const taskSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    kind: zod_1.z.enum(["project", "calendar"]),
    projectId: zod_1.z.string().uuid().optional(),
    project: zod_1.z.string().max(200).optional(),
    title: zod_1.z.string().max(200),
    description: zod_1.z.string().max(800).nullable().optional(),
    priority: zod_1.z.string(),
    status: zod_1.z.string(),
    startAt: zod_1.z.string().nullable().optional(),
    dueAt: zod_1.z.string().nullable(),
    allDay: zod_1.z.boolean(),
    overdue: zod_1.z.boolean(),
    dueToday: zod_1.z.boolean(),
    url: zod_1.z.string().max(500),
    checklist: zod_1.z
        .array(zod_1.z.object({ title: zod_1.z.string(), completed: zod_1.z.boolean() }))
        .max(8),
    checklistCount: zod_1.z.number(),
    childCount: zod_1.z.number(),
    blockedBy: zod_1.z
        .array(zod_1.z.object({ id: zod_1.z.string().uuid(), title: zod_1.z.string() }))
        .max(8),
    unblocks: zod_1.z.number(),
});
const projectSchema = zod_1.z.object({
    available: zod_1.z.literal(true),
    projectIds: zod_1.z.array(zod_1.z.string().uuid()).max(1000),
    partial: zod_1.z.boolean(),
    tasks: zod_1.z.array(taskSchema).max(60),
    metrics: metricsSchema,
});
const calendarSchema = zod_1.z.object({
    available: zod_1.z.literal(true),
    timeZone: zod_1.z.string(),
    partial: zod_1.z.boolean(),
    busyPartial: zod_1.z.boolean(),
    busy: zod_1.z
        .array(zod_1.z
        .object({
        startAt: zod_1.z.string().datetime({ offset: true }),
        endAt: zod_1.z.string().datetime({ offset: true }),
    })
        .refine((interval) => Date.parse(interval.endAt) > Date.parse(interval.startAt), "Invalid busy interval"))
        .max(2000),
    tasks: zod_1.z.array(taskSchema).max(60),
    metrics: metricsSchema,
    focus: zod_1.z.object({
        seconds: zod_1.z.number().nonnegative(),
        sessions: zod_1.z.number().nonnegative(),
        perTask: zod_1.z
            .array(zod_1.z.object({
            taskId: zod_1.z.string().uuid().nullable(),
            eventId: zod_1.z.string().uuid().nullable(),
            seconds: zod_1.z.number(),
            sessions: zod_1.z.number(),
        }))
            .max(60),
    }),
});
function rankTasks(tasks) {
    const priority = {
        URGENT: 4,
        HIGH: 3,
        MEDIUM: 2,
        LOW: 1,
    };
    return [...tasks].sort((a, b) => Number(b.overdue) - Number(a.overdue) ||
        Number(b.dueToday) - Number(a.dueToday) ||
        Number(!!a.blockedBy.length) - Number(!!b.blockedBy.length) ||
        (priority[b.priority] ?? 0) - (priority[a.priority] ?? 0) ||
        (Date.parse(a.dueAt ?? "") || Infinity) -
            (Date.parse(b.dueAt ?? "") || Infinity) ||
        b.unblocks - a.unblocks ||
        a.id.localeCompare(b.id));
}
let WorkContextService = class WorkContextService {
    async call(service, path, body, signal) {
        if (env_config_1.config.WORK_ASSISTANT_SERVICE_KEY.length < 32)
            throw new common_1.ServiceUnavailableException("Trợ lý công việc chưa được cấu hình.");
        const base = service === "project"
            ? env_config_1.config.WORK_ASSISTANT_PROJECT_URL
            : env_config_1.config.WORK_ASSISTANT_CALENDAR_URL;
        const response = await fetch(base.replace(/\/$/, "") + "/internal/work-assistant/" + path, {
            method: "POST",
            redirect: "error",
            signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
                : AbortSignal.timeout(10000),
            headers: {
                "content-type": "application/json",
                "x-internal-service-key": env_config_1.config.WORK_ASSISTANT_SERVICE_KEY,
            },
            body: JSON.stringify(body),
        });
        if (response.status === 403 || response.status === 404) {
            await response.body?.cancel();
            throw new common_1.ForbiddenException("Bạn không còn quyền xem dự án này.");
        }
        if (!response.ok) {
            await response.body?.cancel();
            throw new common_1.ServiceUnavailableException("Nguồn dữ liệu chưa truy cập được.");
        }
        const text = await (0, read_response_1.readResponseText)(response, 350000);
        return JSON.parse(text).data;
    }
    async authorize(actor, projectIds, signal) {
        if (!projectIds.length)
            return new Set();
        const ids = [...new Set(projectIds)];
        if (ids.length > 1000)
            throw new common_1.ServiceUnavailableException("Quá nhiều dự án trong lịch sử.");
        const data = zod_1.z
            .object({ projectIds: zod_1.z.array(zod_1.z.string().uuid()).max(1000) })
            .parse(await this.call("project", "authorize", { userId: actor.id, projectIds: ids }, signal));
        return new Set(data.projectIds);
    }
    async requireScope(actor, scope, signal) {
        if (scope.projectId &&
            !(await this.authorize(actor, [scope.projectId], signal)).has(scope.projectId))
            throw new common_1.ForbiddenException("Bạn không còn quyền xem dự án này.");
    }
    async read(actor, scope, days = 7, signal, fallbackTimeZone) {
        await this.requireScope(actor, scope, signal);
        const now = new Date();
        let timeZone = fallbackTimeZone ?? "Asia/Ho_Chi_Minh";
        let range = (0, work_time_1.workRange)(now, timeZone, days);
        const calendarRead = async () => calendarSchema.parse(await this.call("calendar", "context", {
            userId: actor.id,
            ...(scope.projectId ? { projectId: scope.projectId } : {}),
            from: range.from,
            to: range.to,
            windowStart: range.windowStart,
            windowEnd: range.windowEnd,
            todayEnd: range.to,
        }, signal));
        const outcomes = await Promise.allSettled([
            this.call("project", "context", {
                userId: actor.id,
                ...scope,
                from: range.from,
                to: range.to,
                now: now.toISOString(),
                timeZone,
            }, signal).then((d) => projectSchema.parse(d)),
            calendarRead(),
        ]);
        if (signal?.aborted)
            signal.throwIfAborted();
        if (outcomes[0].status === "rejected" &&
            outcomes[0].reason instanceof common_1.ForbiddenException)
            throw outcomes[0].reason;
        let project = outcomes[0].status === "fulfilled" ? outcomes[0].value : null;
        let calendar = outcomes[1].status === "fulfilled" ? outcomes[1].value : null;
        if (!fallbackTimeZone && calendar && calendar.timeZone !== timeZone) {
            try {
                new Intl.DateTimeFormat("en", { timeZone: calendar.timeZone }).format();
                timeZone = calendar.timeZone;
                range = (0, work_time_1.workRange)(now, timeZone, days);
                const updated = await Promise.allSettled([
                    this.call("project", "context", {
                        userId: actor.id,
                        ...scope,
                        from: range.from,
                        to: range.to,
                        now: now.toISOString(),
                        timeZone,
                    }, signal).then((d) => projectSchema.parse(d)),
                    calendarRead(),
                ]);
                if (updated[0].status === "rejected" &&
                    updated[0].reason instanceof common_1.ForbiddenException)
                    throw updated[0].reason;
                project = updated[0].status === "fulfilled" ? updated[0].value : null;
                calendar = updated[1].status === "fulfilled" ? updated[1].value : null;
            }
            catch (error) {
                if (error instanceof common_1.ForbiddenException)
                    throw error;
                project = null;
                calendar = null;
            }
        }
        // Personal Calendar tasks are separate from project tasks, never copies of synced tasks.
        const tasks = rankTasks([
            ...(project?.tasks ?? []),
            ...(!scope.projectId ? (calendar?.tasks ?? []) : []),
        ]);
        return {
            scope,
            fetchedAt: now.toISOString(),
            date: range.today,
            timeZone,
            days,
            period: { from: range.from, to: range.to },
            projectIds: project?.projectIds ?? (scope.projectId ? [scope.projectId] : []),
            sources: {
                project: {
                    state: !project
                        ? "unavailable"
                        : project.partial
                            ? "partial"
                            : project.metrics.open || project.metrics.completedInPeriod
                                ? "ready"
                                : "empty",
                },
                calendar: {
                    state: !calendar
                        ? "unavailable"
                        : calendar.partial || calendar.busyPartial
                            ? "partial"
                            : calendar.tasks.length ||
                                calendar.busy.length ||
                                calendar.focus.sessions ||
                                calendar.metrics.completedInPeriod
                                ? "ready"
                                : "empty",
                },
            },
            metrics: {
                project: project?.metrics ?? null,
                personal: !scope.projectId ? (calendar?.metrics ?? null) : null,
                focusSeconds: calendar?.focus.seconds ?? null,
                focusSessions: calendar?.focus.sessions ?? null,
            },
            tasks: tasks.slice(0, 60),
            detailPartial: !!(project?.partial ||
                calendar?.partial ||
                tasks.length > 60),
            busyPartial: !calendar || calendar.busyPartial,
            focusPerTask: calendar?.focus.perTask ?? [],
            schedulingBasis: "calendar",
            freeSlots: (0, work_time_1.freeSlots)(now, timeZone, calendar?.busy ?? [], !calendar || calendar.busyPartial),
            busy: calendar?.busy ?? [],
        };
    }
};
exports.WorkContextService = WorkContextService;
exports.WorkContextService = WorkContextService = __decorate([
    (0, common_1.Injectable)()
], WorkContextService);
