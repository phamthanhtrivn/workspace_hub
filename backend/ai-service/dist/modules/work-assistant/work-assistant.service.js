"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkAssistantService = void 0;
const common_1 = require("@nestjs/common");
const sse_1 = require("../../common/sse");
const abort_polling_1 = require("../../common/abort-polling");
const env_config_1 = require("../../config/env.config");
const pipeline_profiler_1 = require("../../common/profiling/pipeline-profiler");
const work_context_1 = require("./work-context");
const work_store_1 = require("./work-store");
const work_agent_1 = require("./work-agent");
let WorkAssistantService = class WorkAssistantService {
    store;
    context;
    constructor(store, context) {
        this.store = store;
        this.context = context;
    }
    enabled() {
        if (env_config_1.config.WORK_ASSISTANT_ENABLED !== "true" ||
            env_config_1.config.WORK_ASSISTANT_SERVICE_KEY.length < 32)
            throw new common_1.ServiceUnavailableException("Trợ lý công việc chưa được bật hoặc cấu hình.");
    }
    scope(session, audience = "mine") {
        return {
            ...(session.project_id ? { projectId: session.project_id } : {}),
            audience: session.project_id ? audience : "mine",
        };
    }
    async visible(actor, messages, signal) {
        const references = [...new Set(messages.flatMap((m) => m.project_ids))];
        const allowed = await this.context.authorize(actor, references, signal);
        return messages.map((m) => m.project_ids.some((id) => !allowed.has(id))
            ? {
                ...m,
                content: "Nội dung đã được ẩn vì quyền truy cập dự án đã thay đổi.",
                sources: [],
                project_ids: [],
                hidden: true,
            }
            : m);
    }
    async owned(actor, id) {
        const session = await this.store.owned(actor, id);
        await this.context.requireScope(actor, this.scope(session));
        return session;
    }
    async overview(actor, input) {
        this.enabled();
        const { timeZone, ...scope } = input;
        return {
            data: await this.context.read(actor, scope, 7, undefined, timeZone),
        };
    }
    async session(actor, data) {
        this.enabled();
        await this.context.requireScope(actor, {
            projectId: data.projectId,
            audience: "mine",
        });
        const session = data.sessionId
            ? await this.owned(actor, data.sessionId)
            : await this.store.session(actor, data.projectId);
        if (session.project_id !== (data.projectId ?? null))
            throw new common_1.HttpException("Conversation scope does not match", 400);
        const page = await this.store.history(session, data.before);
        return {
            data: {
                id: session.id,
                projectId: session.project_id,
                messages: await this.visible(actor, page.messages),
                nextCursor: page.nextCursor,
            },
        };
    }
    async sessions(actor, data) {
        this.enabled();
        await this.context.requireScope(actor, {
            projectId: data.projectId,
            audience: "mine",
        });
        const page = await this.store.list(actor, data.projectId, data.before);
        const ids = [...new Set(page.sessions.flatMap((s) => s.project_ids))];
        const allowed = await this.context.authorize(actor, ids);
        return {
            data: {
                sessions: page.sessions.map((s) => ({
                    id: s.id,
                    projectId: s.project_id,
                    updatedAt: s.updated_at,
                    title: s.project_ids.some((id) => !allowed.has(id))
                        ? "Cuộc trò chuyện trước đây"
                        : s.content?.replace(/\s+/g, " ").trim().slice(0, 100) ||
                            "Cuộc trò chuyện mới",
                })),
                nextCursor: page.nextCursor,
            },
        };
    }
    async createSession(actor, projectId) {
        this.enabled();
        await this.context.requireScope(actor, {
            projectId,
            audience: "mine",
        });
        const session = await this.store.session(actor, projectId, true);
        return {
            data: {
                id: session.id,
                projectId: session.project_id,
                messages: [],
                nextCursor: null,
            },
        };
    }
    async cancel(actor, requestId) {
        this.enabled();
        await this.store.cancel(actor, requestId);
        return { data: { canceled: true } };
    }
    async message(actor, sessionId, input, res) {
        this.enabled();
        const session = await this.owned(actor, sessionId);
        if (!session.project_id && input.audience === "project")
            throw new common_1.HttpException("Project scope required", 400);
        await this.answer(actor, res, session, input);
    }
    async answer(actor, res, session, input) {
        const { requestId } = input;
        if (res.destroyed)
            return;
        await this.store.begin(actor, session, requestId);
        if (res.destroyed) {
            await this.store.fail(actor, requestId, true);
            return;
        }
        const controller = new AbortController();
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, 105000);
        const stopPolling = (0, abort_polling_1.pollUntilAborted)(controller, 1000, async () => {
            if (await this.store.canceled(actor, requestId))
                controller.abort();
        });
        const close = () => controller.abort();
        res.once("close", close);
        (0, sse_1.startEventStream)(res);
        (0, sse_1.event)(res, "request", { requestId });
        const heartbeat = setInterval(() => {
            if (!res.destroyed)
                res.write(": heartbeat\n\n");
        }, 15000);
        const timing = new pipeline_profiler_1.Profile("work_assistant");
        let completed = false;
        try {
            (0, sse_1.event)(res, "status", { message: "Đang lấy dữ liệu mới…" });
            const result = await this.generateAnswer({ actor, session, input, signal: controller.signal, timing }, (message) => (0, sse_1.event)(res, "status", { message }));
            completed = true;
            (0, sse_1.event)(res, "done", result);
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError")
                controller.abort();
            await this.store
                .fail(actor, requestId, controller.signal.aborted && !timedOut)
                .catch(() => undefined);
            const status = error instanceof common_1.HttpException ? error.getStatus() : 503;
            (0, sse_1.event)(res, "error", {
                requestId,
                status,
                message: this.failureMessage(status, timedOut, controller.signal.aborted),
            });
            console.warn(JSON.stringify({
                event: "work_assistant_failed",
                requestId,
                status,
                canceled: controller.signal.aborted,
            }));
        }
        finally {
            timing.finish(completed ? "ok" : "failed");
            controller.abort();
            clearTimeout(timeout);
            stopPolling();
            clearInterval(heartbeat);
            res.off("close", close);
            res.end();
        }
    }
    failureMessage(status, timedOut, canceled) {
        if (timedOut)
            return "Hết thời gian chờ AI. Vui lòng thử lại sau.";
        if (canceled)
            return "Yêu cầu đã dừng.";
        if (status === 403)
            return "Quyền truy cập đã thay đổi. Vui lòng mở lại trợ lý.";
        if (status === 429)
            return "AI đang chờ hạn mức. Hãy thử lại sau.";
        return "Chưa thể trả lời lúc này. Vui lòng thử lại; trợ lý chưa thay đổi dữ liệu công việc.";
    }
    async initialContext(actor, scope, question, signal, timeZone) {
        const contexts = await Promise.all((0, work_agent_1.requestedWorkWindows)(question).map((days) => this.context.read(actor, scope, days, signal, timeZone)));
        const initial = contexts.at(-1);
        if (contexts.length === 1)
            return initial;
        return {
            ...initial,
            projectIds: [
                ...new Set(contexts.flatMap((context) => context.projectIds)),
            ],
            comparison: contexts.map(({ days, period, fetchedAt, sources, metrics }) => ({
                days,
                period,
                fetchedAt,
                sources,
                metrics,
            })),
        };
    }
    async generateAnswer(request, onStatus) {
        const { actor, session, input, signal, timing } = request;
        const { question, requestId, audience, timeZone } = input;
        const scope = this.scope(session, audience);
        const [history, initial] = await Promise.all([
            timing.measure("history_ms", () => this.store
                .recent(session)
                .then((messages) => this.visible(actor, messages, signal))),
            timing.measure("context_ms", () => this.initialContext(actor, scope, question, signal, timeZone)),
        ]);
        const result = await timing.measure("model_ms", () => (0, work_agent_1.workAnswer)(question, history, initial, (days) => this.context.read(actor, scope, days, signal, timeZone), signal, onStatus));
        signal.throwIfAborted();
        const projectIds = [
            ...new Set([
                ...result.context.projectIds,
                ...history.flatMap((m) => m.project_ids),
            ]),
        ];
        const allowed = await this.context.authorize(actor, projectIds, signal);
        if (projectIds.some((id) => !allowed.has(id)))
            throw new common_1.HttpException("Quyền truy cập dự án đã thay đổi.", 403);
        if (await this.store.canceled(actor, requestId))
            throw new DOMException("Request canceled", "AbortError");
        signal.throwIfAborted();
        const references = (result.referenceTasks ?? (0, work_agent_1.modelContext)(result.context).tasks).map((t) => ({
            id: t.id,
            kind: t.kind,
            ...(t.projectId ? { projectId: t.projectId } : {}),
            title: t.title,
            url: t.url,
            dueAt: t.dueAt,
        }));
        const message = await timing.measure("persist_ms", () => this.store.finish(actor, session, requestId, question, result.content, references, projectIds, {
            scope,
            fetchedAt: result.context.fetchedAt,
            timeZone: result.context.timeZone,
            days: result.context.days,
        }));
        return {
            requestId,
            message,
            scope,
            fetchedAt: result.context.fetchedAt,
            sources: result.context.sources,
        };
    }
};
exports.WorkAssistantService = WorkAssistantService;
exports.WorkAssistantService = WorkAssistantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [work_store_1.WorkStore,
        work_context_1.WorkContextService])
], WorkAssistantService);
