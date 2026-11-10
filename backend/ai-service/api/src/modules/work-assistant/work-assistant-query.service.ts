import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  overviewSchema,
  sessionSchema,
  sessionsSchema,
} from "./work-assistant.schemas";
import type { Actor } from "../../common/types";
import type { ConversationContext } from "./work-assistant.types";
import { WorkContextService } from "./work-context";
import { WorkStore } from "./work-store";
import { WorkAssistantAccessService } from "./work-assistant-access.service";

@Injectable()
export class WorkAssistantQueryService {
  constructor(
    private readonly context: WorkContextService,
    private readonly store: WorkStore,
    private readonly access: WorkAssistantAccessService,
  ) {}
  async overview(actor: Actor, input: z.infer<typeof overviewSchema>) {
    this.access.enabled();
    const { timeZone, ...scope } = input;

    return {
      data: await this.context.read(actor, scope, 7, undefined, timeZone),
    };
  }

  async session(actor: Actor, data: z.infer<typeof sessionSchema>) {
    this.access.enabled();
    if (!data.sessionId)
      await this.context.requireScope(actor, this.access.scope(data));
    const session = data.sessionId
      ? await this.access.owned(actor, data.sessionId, data)
      : await this.store.session(actor, data);
    const page = await this.store.history(session, data.before);

    return {
      data: {
        id: session.id,
        projectId: session.project_id,
        contextType: session.context_type,
        messages: await this.access.visible(actor, page.messages),
        nextCursor: page.nextCursor,
      },
    };
  }

  async sessions(actor: Actor, data: z.infer<typeof sessionsSchema>) {
    this.access.enabled();
    await this.context.requireScope(actor, this.access.scope(data));
    const page = await this.store.list(actor, data, data.before);
    const ids = [...new Set(page.sessions.flatMap((s) => s.project_ids))];
    const allowed = await this.context.authorize(actor, ids);

    return {
      data: {
        sessions: page.sessions.map((s) => ({
          id: s.id,
          projectId: s.project_id,
          contextType: s.context_type,
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

  async createSession(actor: Actor, context: ConversationContext) {
    this.access.enabled();
    await this.context.requireScope(actor, this.access.scope(context));
    const session = await this.store.session(actor, context, true);

    return {
      data: {
        id: session.id,
        projectId: session.project_id,
        contextType: session.context_type,
        messages: [],
        nextCursor: null,
      },
    };
  }
}
