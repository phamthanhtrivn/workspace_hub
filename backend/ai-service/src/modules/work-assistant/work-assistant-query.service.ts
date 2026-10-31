import { HttpException, Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  overviewSchema,
  sessionSchema,
  sessionsSchema,
} from "./work-assistant.schemas";
import type { Actor } from "../../common/types";
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
    await this.context.requireScope(actor, {
      projectId: data.projectId,
      audience: "mine",
    });
    const session = data.sessionId
      ? await this.access.owned(actor, data.sessionId)
      : await this.store.session(actor, data.projectId);
    if (session.project_id !== (data.projectId ?? null))
      throw new HttpException("Conversation scope does not match", 400);
    const page = await this.store.history(session, data.before);
    return {
      data: {
        id: session.id,
        projectId: session.project_id,
        messages: await this.access.visible(actor, page.messages),
        nextCursor: page.nextCursor,
      },
    };
  }

  async sessions(actor: Actor, data: z.infer<typeof sessionsSchema>) {
    this.access.enabled();
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
    this.access.enabled();
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
}
