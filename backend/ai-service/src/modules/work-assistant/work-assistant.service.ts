import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Response } from "express";
import { event, startEventStream } from "../../common/sse";
import { pollUntilAborted } from "../../common/abort-polling";
import { z } from "zod";
import {
  overviewSchema,
  sessionSchema,
  sessionsSchema,
  messageSchema,
} from "./work-assistant.schemas";
import type { Actor } from "../../common/types";
import { config } from "../../config/env.config";
import { Profile } from "../../common/profiling/pipeline-profiler";
import { WorkContextService } from "./work-context";
import { WorkStore, type WorkSession } from "./work-store";
import { modelContext, requestedWorkWindows, workAnswer } from "./work-agent";
import type {
  StoredMessage,
  TaskReference,
  WorkScope,
  WorkContext,
} from "./work-assistant.types";

@Injectable()
export class WorkAssistantService {
  constructor(
    private readonly store: WorkStore,
    private readonly context: WorkContextService,
  ) {}
  private enabled() {
    if (
      config.WORK_ASSISTANT_ENABLED !== "true" ||
      config.WORK_ASSISTANT_SERVICE_KEY.length < 32
    )
      throw new ServiceUnavailableException(
        "Trợ lý công việc chưa được bật hoặc cấu hình.",
      );
  }
  private scope(
    session: WorkSession,
    audience: "mine" | "project" = "mine",
  ): WorkScope {
    return {
      ...(session.project_id ? { projectId: session.project_id } : {}),
      audience: session.project_id ? audience : "mine",
    };
  }
  private async visible(
    actor: Actor,
    messages: StoredMessage[],
    signal?: AbortSignal,
  ) {
    const references = [...new Set(messages.flatMap((m) => m.project_ids))];
    const allowed = await this.context.authorize(actor, references, signal);
    return messages.map((m) =>
      m.project_ids.some((id) => !allowed.has(id))
        ? {
            ...m,
            content: "Nội dung đã được ẩn vì quyền truy cập dự án đã thay đổi.",
            sources: [],
            project_ids: [],
            hidden: true,
          }
        : m,
    );
  }
  private async owned(actor: Actor, id: string) {
    const session = await this.store.owned(actor, id);
    await this.context.requireScope(actor, this.scope(session));
    return session;
  }
  async overview(actor: Actor, input: z.infer<typeof overviewSchema>) {
    this.enabled();
    const { timeZone, ...scope } = input;
    return {
      data: await this.context.read(actor, scope, 7, undefined, timeZone),
    };
  }
  async session(actor: Actor, data: z.infer<typeof sessionSchema>) {
    this.enabled();
    await this.context.requireScope(actor, {
      projectId: data.projectId,
      audience: "mine",
    });
    const session = data.sessionId
      ? await this.owned(actor, data.sessionId)
      : await this.store.session(actor, data.projectId);
    if (session.project_id !== (data.projectId ?? null))
      throw new HttpException("Conversation scope does not match", 400);
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
  async sessions(actor: Actor, data: z.infer<typeof sessionsSchema>) {
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
  async createSession(actor: Actor, projectId?: string) {
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
  async cancel(actor: Actor, requestId: string) {
    this.enabled();
    await this.store.cancel(actor, requestId);
    return { data: { canceled: true } };
  }

  async message(
    actor: Actor,
    sessionId: string,
    input: z.infer<typeof messageSchema>,
    res: Response,
  ) {
    this.enabled();
    const session = await this.owned(actor, sessionId);
    if (!session.project_id && input.audience === "project")
      throw new HttpException("Project scope required", 400);
    await this.answer(actor, res, session, input);
  }

  private async answer(
    actor: Actor,
    res: Response,
    session: WorkSession,
    input: z.infer<typeof messageSchema>,
  ) {
    const { requestId } = input;
    if (res.destroyed) return;
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
    const stopPolling = pollUntilAborted(controller, 1000, async () => {
      if (await this.store.canceled(actor, requestId)) controller.abort();
    });
    const close = () => controller.abort();
    res.once("close", close);
    startEventStream(res);
    event(res, "request", { requestId });
    const heartbeat = setInterval(() => {
      if (!res.destroyed) res.write(": heartbeat\n\n");
    }, 15000);
    const timing = new Profile("work_assistant");
    let completed = false;
    try {
      event(res, "status", { message: "Đang lấy dữ liệu mới…" });
      const result = await this.generateAnswer(
        { actor, session, input, signal: controller.signal, timing },
        (message) => event(res, "status", { message }),
      );
      completed = true;
      event(res, "done", result);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError")
        controller.abort();
      await this.store
        .fail(actor, requestId, controller.signal.aborted && !timedOut)
        .catch(() => undefined);
      const status = error instanceof HttpException ? error.getStatus() : 503;
      event(res, "error", {
        requestId,
        status,
        message: this.failureMessage(
          status,
          timedOut,
          controller.signal.aborted,
        ),
      });
      console.warn(
        JSON.stringify({
          event: "work_assistant_failed",
          requestId,
          status,
          canceled: controller.signal.aborted,
        }),
      );
    } finally {
      timing.finish(completed ? "ok" : "failed");
      controller.abort();
      clearTimeout(timeout);
      stopPolling();
      clearInterval(heartbeat);
      res.off("close", close);
      res.end();
    }
  }

  private failureMessage(status: number, timedOut: boolean, canceled: boolean) {
    if (timedOut) return "Hết thời gian chờ AI. Vui lòng thử lại sau.";
    if (canceled) return "Yêu cầu đã dừng.";
    if (status === 403)
      return "Quyền truy cập đã thay đổi. Vui lòng mở lại trợ lý.";
    if (status === 429) return "AI đang chờ hạn mức. Hãy thử lại sau.";
    return "Chưa thể trả lời lúc này. Vui lòng thử lại; trợ lý chưa thay đổi dữ liệu công việc.";
  }

  private async initialContext(
    actor: Actor,
    scope: WorkScope,
    question: string,
    signal: AbortSignal,
    timeZone?: string,
  ): Promise<WorkContext> {
    const contexts = await Promise.all(
      requestedWorkWindows(question).map((days) =>
        this.context.read(actor, scope, days, signal, timeZone),
      ),
    );
    const initial = contexts.at(-1)!;
    if (contexts.length === 1) return initial;
    return {
      ...initial,
      projectIds: [
        ...new Set(contexts.flatMap((context) => context.projectIds)),
      ],
      comparison: contexts.map(
        ({ days, period, fetchedAt, sources, metrics }) => ({
          days,
          period,
          fetchedAt,
          sources,
          metrics,
        }),
      ),
    };
  }

  private async generateAnswer(
    request: {
      actor: Actor;
      session: WorkSession;
      input: z.infer<typeof messageSchema>;
      signal: AbortSignal;
      timing: Profile;
    },
    onStatus: (message: string) => void,
  ) {
    const { actor, session, input, signal, timing } = request;
    const { question, requestId, audience, timeZone } = input;
    const scope = this.scope(session, audience);
    const [history, initial] = await Promise.all([
      timing.measure("history_ms", () =>
        this.store
          .recent(session)
          .then((messages) => this.visible(actor, messages, signal)),
      ),
      timing.measure("context_ms", () =>
        this.initialContext(actor, scope, question, signal, timeZone),
      ),
    ]);
    const result = await timing.measure("model_ms", () =>
      workAnswer(
        question,
        history,
        initial,
        (days) => this.context.read(actor, scope, days, signal, timeZone),
        signal,
        onStatus,
      ),
    );
    signal.throwIfAborted();
    const projectIds = [
      ...new Set([
        ...result.context.projectIds,
        ...history.flatMap((m) => m.project_ids),
      ]),
    ];
    const allowed = await this.context.authorize(actor, projectIds, signal);
    if (projectIds.some((id) => !allowed.has(id)))
      throw new HttpException("Quyền truy cập dự án đã thay đổi.", 403);
    if (await this.store.canceled(actor, requestId))
      throw new DOMException("Request canceled", "AbortError");
    signal.throwIfAborted();
    const references: TaskReference[] = (
      result.referenceTasks ?? modelContext(result.context).tasks
    ).map((t) => ({
      id: t.id,
      kind: t.kind,
      ...(t.projectId ? { projectId: t.projectId } : {}),
      title: t.title,
      url: t.url,
      dueAt: t.dueAt,
    }));
    const message = await timing.measure("persist_ms", () =>
      this.store.finish(
        actor,
        session,
        requestId,
        question,
        result.content,
        references,
        projectIds,
        {
          scope,
          fetchedAt: result.context.fetchedAt,
          timeZone: result.context.timeZone,
          days: result.context.days,
        },
      ),
    );
    return {
      requestId,
      message,
      scope,
      fetchedAt: result.context.fetchedAt,
      sources: result.context.sources,
    };
  }
}
