import { Injectable, NotFoundException } from "@nestjs/common";
import type { Actor } from "../../common/types";
import { WorkContextService } from "./work-context";
import { WorkStore, type WorkSession } from "./work-store";
import { contextAudience } from "./work-assistant.schemas";
import type {
  ConversationContext,
  StoredMessage,
  WorkScope,
} from "./work-assistant.types";

@Injectable()
export class WorkAssistantAccessService {
  constructor(
    private readonly context: WorkContextService,
    private readonly store: WorkStore,
  ) {}
  scope(context: ConversationContext): WorkScope {
    return {
      ...(context.projectId ? { projectId: context.projectId } : {}),
      audience: contextAudience(context),
    };
  }

  sessionScope(session: WorkSession): WorkScope {
    return this.scope({
      contextType: session.context_type,
      projectId: session.project_id ?? undefined,
    });
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

  async owned(actor: Actor, id: string, context: ConversationContext) {
    const session = await this.store.owned(actor, id);
    if (
      session.context_type !== context.contextType ||
      session.project_id !== (context.projectId ?? null)
    )
      throw new NotFoundException("Conversation not found in this context");
    await this.context.requireScope(actor, this.sessionScope(session));

    return session;
  }
}
