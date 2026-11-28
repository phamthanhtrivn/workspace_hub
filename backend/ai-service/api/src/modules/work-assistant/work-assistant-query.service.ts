import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
import { createHash } from "node:crypto";
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
  async cacheAccess(actor: Actor, context: ConversationContext) {
    await this.context.requireScope(actor, this.access.scope(context));
    const projects = (
      await this.store.referencedProjects(actor, context)
    ).sort();
    const allowed = await this.context.authorize(actor, projects);
    const denied = projects.filter((project) => !allowed.has(project));

    return {
      data: {
        permissionStamp: createHash("sha256")
          .update(JSON.stringify(denied))
          .digest("hex"),
      },
    };
  }

  async requestStatus(
    actor: Actor,
    sessionId: string,
    requestId: string,
    context: ConversationContext,
  ) {
    await this.access.owned(actor, sessionId, context);

    return {
      data: {
        status: await this.store.requestStatus(actor, sessionId, requestId),
      },
    };
  }

  async overview(actor: Actor, input: z.infer<typeof overviewSchema>) {
    const { timeZone, ...scope } = input;

    return {
      data: await this.context.read(actor, scope, 7, undefined, timeZone),
    };
  }

  async session(actor: Actor, data: z.infer<typeof sessionSchema>) {
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
            ? AI_UI_MESSAGES.PREVIOUS_CONVERSATION
            : s.content?.replace(/\s+/g, " ").trim().slice(0, 100) ||
              AI_UI_MESSAGES.NEW_CONVERSATION,
        })),
        nextCursor: page.nextCursor,
      },
    };
  }

  async createSession(actor: Actor, context: ConversationContext) {
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
