import { rows } from "../../infrastructure/database/database";
import { ChatStreamInput } from "./chat-stream.types";
import { Injectable } from "@nestjs/common";
import { pollUntilAborted } from "../../common/abort-polling";
import { isCancellation } from "../../common/abort-guard";
import { SourcesService } from "../sources/sources.service";
import type { Actor } from "../../common/types";
import { createSourceAuthorization } from "../../common/source-authorization";
import { config } from "../../config/env.config";
import { notebookIntent } from "./chat-response";
import { completeChatRequest } from "./chat-request";
import { ChatGenerationService } from "./chat-generation.service";
import { logError } from "../../common/errors/error-log";
import { notebookFailureMessage } from "./notebook-failure";

@Injectable()
export class ChatWorkflowService {
  constructor(
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
    const intent = notebookIntent(question);
    const snapshot = sources.map(({ id, revision }) => ({ id, revision }));
    const authorize = createSourceAuthorization({
      actor,
      sources,
      snapshot,
      loadSources: () => this.sources.sources(notebookId),
      signal: controller.signal,
    });
    const check = async () => {
      try {
        const [state] = await rows(
          "SELECT status FROM notebook_ai.requests WHERE id=$1",
          [requestId],
        );
        if (state?.status !== "RUNNING") controller.abort();
      } catch (error) {
        logError("notebook_cancel_check_failed", error, {
          request_id: requestId,
        });
        controller.abort(error);
      }
    };
    const stopPolling = pollUntilAborted(
      controller,
      config.CHAT_CANCEL_POLL_MS,
      check,
    );
    const permissions = setInterval(() => {
      if (!controller.signal.aborted)
        void authorize().catch((error) => {
          logError("notebook_source_check_failed", error, {
            request_id: requestId,
          });
          controller.abort(error);
        });
    }, 3000);
    let stage = "generation";
    try {
      stream.start();
      stream.emit("status", {
        requestId,
        stage: intent.kind === "reply" ? "GENERATING" : "RETRIEVING",
      });
      controller.signal.throwIfAborted();
      const answer = await this.generation.generateReply({
        ...input,
        snapshot,
        authorize,
        intent,
      });
      stage = "final_source_check";
      await authorize();
      controller.signal.throwIfAborted();
      stage = "save_answer";
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
      const failure = controller.signal.aborted
        ? controller.signal.reason
        : error;
      const canceled = isCancellation(controller.signal);
      logError("notebook_chat_failed", failure, {
        request_id: requestId,
        stage,
        canceled,
      });
      try {
        await rows(
          "UPDATE notebook_ai.requests SET status=$2,updated_at=now() WHERE id=$1 AND status='RUNNING'",
          [requestId, canceled ? "CANCELLED" : "FAILED"],
        );
      } catch (saveError) {
        logError("notebook_request_status_failed", saveError, {
          request_id: requestId,
        });
      }
      stream.emit("error", {
        message: canceled
          ? "Response stopped. The request was not resent."
          : notebookFailureMessage(failure),
      });
    } finally {
      stopPolling();
      clearInterval(permissions);
      controller.abort();
      stream.end();
    }
  }

  async cancel(actor: Actor, requestId: string) {
    await rows(
      "UPDATE notebook_ai.requests SET status='CANCELLED',updated_at=now() WHERE id=$1 AND owner_id=$2 AND status='RUNNING'",
      [requestId, actor.id],
    );
    await rows(
      "UPDATE notebook_ai.artifacts SET status='CANCELLED',updated_at=now() WHERE id=$1 AND notebook_id IN(SELECT id FROM notebook_ai.notebooks WHERE owner_id=$2) AND status IN ('QUEUED','RUNNING')",
      [requestId, actor.id],
    );

    return {};
  }
}
