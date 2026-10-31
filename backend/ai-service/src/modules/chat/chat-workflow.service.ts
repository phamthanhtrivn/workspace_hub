import { AiDatabaseClient } from "../../infrastructure/database/ai-database.client";
import { ChatStreamInput } from "./chat-stream.types";
import { Injectable } from "@nestjs/common";
import { pollUntilAborted } from "../../common/abort-polling";
import { SourcesService } from "../sources/sources.service";
import type { Actor } from "../../common/types";
import { createChatAuthorization } from "./chat-authorization";
import { config } from "../../config/env.config";
import { immediateReply } from "./chat-response";
import { completeChatRequest } from "./chat-request";
import { ChatGenerationService } from "./chat-generation.service";

@Injectable()
export class ChatWorkflowService {
  constructor(
    private readonly database: AiDatabaseClient,
    private readonly sources: SourcesService,
    private readonly generation: ChatGenerationService,
  ) {}
  async streamAnswer(input: ChatStreamInput) {
    const {
      actor,
      notebookId,
      question,
      requestId,
      stream,
      sources,
      controller,
    } = input;
    const reply = immediateReply(question);
    const snapshot = sources.map(({ id, revision }) => ({ id, revision }));
    const authorize = createChatAuthorization({
      actor,
      sources,
      snapshot,
      loadSources: () => this.sources.sources(notebookId),
      signal: controller.signal,
    });
    const check = async () => {
      const [state] = await this.database.rows(
        "SELECT status FROM notebook_ai.requests WHERE id=$1",
        [requestId],
      );
      if (state?.status !== "RUNNING") controller.abort();
    };
    const stopPolling = pollUntilAborted(
      controller,
      config.CHAT_CANCEL_POLL_MS,
      check,
    );
    const permissions = setInterval(() => {
      if (!controller.signal.aborted)
        void authorize().catch(() => controller.abort());
    }, 3000);
    try {
      stream.start();
      stream.emit("status", {
        requestId,
        stage: reply ? "GENERATING" : "RETRIEVING",
      });
      controller.signal.throwIfAborted();
      const answer = await this.generation.generateReply({
        ...input,
        snapshot,
        authorize,
      });
      await authorize();
      controller.signal.throwIfAborted();
      const id = await completeChatRequest(
        requestId,
        notebookId,
        answer,
        snapshot,
        answer.artifactId,
      );
      if (answer.artifactId) stream.emit("delta", { text: answer.content });
      stream.emit("done", { id, ...answer });
    } catch (error) {
      await this.database.rows(
        "UPDATE notebook_ai.requests SET status=$2,updated_at=now() WHERE id=$1 AND status='RUNNING'",
        [requestId, controller.signal.aborted ? "CANCELLED" : "FAILED"],
      );
      stream.emit("error", {
        message: controller.signal.aborted
          ? "Đã hủy câu trả lời."
          : safeError(error),
      });
    } finally {
      stopPolling();
      clearInterval(permissions);
      controller.abort();
      stream.end();
    }
  }

  async cancel(actor: Actor, requestId: string) {
    await this.database.rows(
      "UPDATE notebook_ai.requests SET status='CANCELLED',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='RUNNING'",
      [requestId, actor.id],
    );
    await this.database.rows(
      "UPDATE notebook_ai.artifacts SET status='CANCELLED',updated_at=now() WHERE id=$1 AND notebook_id IN(SELECT id FROM notebook_ai.notebooks WHERE owner_id=$2) AND status IN ('QUEUED','RUNNING')",
      [requestId, actor.id],
    );
    return {};
  }
}

function safeError(error: unknown) {
  const message = (error as Error)?.message ?? "";
  if (
    /hạn mức|HTTP \d{3}|bị cắt|trích dẫn|thiếu trích|phiên bản|Mất quyền/i.test(
      message,
    )
  )
    return message;
  return "AI chưa hoàn tất yêu cầu. Kiểm tra kết nối/model và thử lại; yêu cầu không được tự gửi lại.";
}
