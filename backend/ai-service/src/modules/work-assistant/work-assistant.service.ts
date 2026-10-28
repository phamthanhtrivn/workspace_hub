import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Response } from "express";
import type { AuthRequest } from "../../common/auth/auth.guard";
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
} from "./work-assistant.types";

function event(res: Response, name: string, data: unknown) {
  if (!res.destroyed && !res.writableEnded)
    res.write("event: " + name + "\ndata: " + JSON.stringify(data) + "\n\n");
}
@Injectable()
export class WorkAssistantService {
  constructor(
    readonly store: WorkStore,
    readonly context: WorkContextService,
  ) {}
  enabled() {
    if (
      config.WORK_ASSISTANT_ENABLED !== "true" ||
      config.WORK_ASSISTANT_SERVICE_KEY.length < 32
    )
      throw new ServiceUnavailableException(
        "Trợ lý công việc chưa được bật hoặc cấu hình.",
      );
  }
  scope(
    session: WorkSession,
    audience: "mine" | "project" = "mine",
  ): WorkScope {
    return {
      ...(session.project_id ? { projectId: session.project_id } : {}),
      audience: session.project_id ? audience : "mine",
    };
  }
  async visible(actor: Actor, messages: StoredMessage[], signal?: AbortSignal) {
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
  async owned(actor: Actor, id: string) {
    const session = await this.store.owned(actor, id);
    await this.context.requireScope(actor, this.scope(session));
    return session;
  }
  async answer(
    req: AuthRequest,
    res: Response,
    session: WorkSession,
    question: string,
    requestId: string,
    audience: "mine" | "project",
    timeZone?: string,
  ) {
    const actor = req.actor,
      scope = this.scope(session, audience);
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
    let polling = false;
    const poll = setInterval(() => {
      if (polling) return;
      polling = true;
      void this.store
        .canceled(actor, requestId)
        .then((canceled) => {
          if (canceled) controller.abort();
        })
        .catch(() => controller.abort())
        .finally(() => {
          polling = false;
        });
    }, 1000);
    const close = () => controller.abort();
    res.once("close", close);
    res.status(200).set({
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    });
    res.flushHeaders();
    event(res, "request", { requestId });
    const heartbeat = setInterval(() => {
      if (!res.destroyed) res.write(": heartbeat\n\n");
    }, 15000);
    const timing = new Profile("work_assistant");
    let completed = false;
    try {
      event(res, "status", { message: "Đang lấy dữ liệu mới…" });
      const [history, initial] = await Promise.all([
        timing.measure("history_ms", () =>
          this.store
            .recent(session)
            .then((messages) =>
              this.visible(actor, messages, controller.signal),
            ),
        ),
        timing.measure("context_ms", async () => {
          const contexts = await Promise.all(
            requestedWorkWindows(question).map((days) =>
              this.context.read(
                actor,
                scope,
                days,
                controller.signal,
                timeZone,
              ),
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
        }),
      ]);
      const result = await timing.measure("model_ms", () =>
        workAnswer(
          question,
          history,
          initial,
          (days) =>
            this.context.read(actor, scope, days, controller.signal, timeZone),
          controller.signal,
          (message) => event(res, "status", { message }),
        ),
      );
      controller.signal.throwIfAborted();
      const projectIds = [
        ...new Set([
          ...result.context.projectIds,
          ...history.flatMap((m) => m.project_ids),
        ]),
      ];
      const allowed = await this.context.authorize(
        actor,
        projectIds,
        controller.signal,
      );
      if (projectIds.some((id) => !allowed.has(id)))
        throw new HttpException("Quyền truy cập dự án đã thay đổi.", 403);
      if (await this.store.canceled(actor, requestId)) controller.abort();
      controller.signal.throwIfAborted();
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
      completed = true;
      event(res, "done", {
        requestId,
        message,
        scope,
        fetchedAt: result.context.fetchedAt,
        sources: result.context.sources,
      });
    } catch (error) {
      await this.store
        .fail(actor, requestId, controller.signal.aborted && !timedOut)
        .catch(() => undefined);
      const status = error instanceof HttpException ? error.getStatus() : 503;
      event(res, "error", {
        requestId,
        status,
        message: timedOut
          ? "Hết thời gian chờ AI. Vui lòng thử lại sau."
          : controller.signal.aborted
            ? "Yêu cầu đã dừng."
            : status === 403
              ? "Quyền truy cập đã thay đổi. Vui lòng mở lại trợ lý."
              : status === 429
                ? "AI đang chờ hạn mức. Hãy thử lại sau."
                : "Chưa thể trả lời lúc này. Vui lòng thử lại; trợ lý chưa thay đổi dữ liệu công việc.",
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
      clearInterval(poll);
      clearInterval(heartbeat);
      res.off("close", close);
      res.end();
    }
  }
}
