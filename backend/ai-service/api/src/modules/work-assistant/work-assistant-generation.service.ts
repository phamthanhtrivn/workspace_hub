import { HttpException, Injectable } from "@nestjs/common";
import { z } from "zod";
import { messageSchema } from "./work-assistant.schemas";
import type { Actor } from "../../common/types";
import { Profile } from "../../common/profiling/pipeline-profiler";
import { WorkContextService } from "./work-context";
import { WorkStore, type WorkSession } from "./work-store";
import { modelContext, requestedWorkWindows, workAnswer } from "./work-agent";
import type {
  TaskReference,
  WorkScope,
  WorkContext,
} from "./work-assistant.types";
import { WorkAssistantAccessService } from "./work-assistant-access.service";

@Injectable()
export class WorkAssistantGenerationService {
  constructor(
    private readonly context: WorkContextService,
    private readonly store: WorkStore,
    private readonly access: WorkAssistantAccessService,
  ) {}
  async initialContext(
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

  async generateAnswer(
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
    const scope = this.access.scope(session, audience);
    const [history, initial] = await Promise.all([
      timing.measure("history_ms", () =>
        this.store
          .recent(session)
          .then((messages) => this.access.visible(actor, messages, signal)),
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
