import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Actor } from "../../common/types";
import { config } from "../../config/env.config";
import { WorkContextService } from "./work-context";
import { WorkStore, type WorkSession } from "./work-store";
import type { StoredMessage, WorkScope } from "./work-assistant.types";

@Injectable()
export class WorkAssistantAccessService {
  constructor(
    private readonly context: WorkContextService,
    private readonly store: WorkStore,
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
}
