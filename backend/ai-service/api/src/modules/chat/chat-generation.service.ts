import { rows } from "../../infrastructure/database/database";
import { retrieve } from "../../infrastructure/integrations/rag.client";
import { ChatGenerationInput } from "./chat-stream.types";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { citeEvidence, visibleSnapshot } from "../../common/evidence-policy";
import type { Citation, Source } from "../../common/types";
import { generateChatResponse } from "./chat-response";
import { visualEvidence } from "./visual-evidence";
import { notebookMessages } from "../notebooks/notebook-messages";
import { logError } from "../../common/errors/error-log";
import {
  conversationHistory,
  NOTEBOOK_HISTORY_LIMIT,
  retrievalQuestion,
} from "./chat-history";

@Injectable()
export class ChatGenerationService {
  async generateReply(
    input: ChatGenerationInput,
  ): Promise<{ content: string; citations: Citation[] }> {
    const {
      actor,
      notebookId,
      question,
      sourceIds,
      stream,
      sources,
      snapshot,
      controller,
      authorize,
      intent,
    } = input;
    const signal = controller.signal;
    let stage = "history";
    try {
      const recall = intent.kind === "recall";
      const [first] = recall
        ? await rows<{
            content: string;
            sources: { id: string; revision: string }[];
          }>(
            `SELECT m.content,m.sources FROM notebook_ai.messages m
         JOIN notebook_ai.notebooks n ON n.id=m.notebook_id
         WHERE m.notebook_id=$1 AND n.owner_id=$2 AND m.role='USER'
         ORDER BY m.created_at ASC,m.id ASC LIMIT 1`,
            [notebookId, actor.id],
          )
        : [];
      const history =
        intent.kind === "answer" ? await this.history(notebookId, sources) : [];
      signal.throwIfAborted();
      const directReply =
        intent.kind === "reply"
          ? intent.content
          : intent.kind === "answer" && !history.length
            ? (intent.clarification ?? null)
            : null;
      stage = "save_question";
      await rows(
        "INSERT INTO notebook_ai.messages(id,notebook_id,role,content,sources) VALUES($1,$2,'USER',$3,$4)",
        [randomUUID(), notebookId, question, JSON.stringify(snapshot)],
      );
      if (recall) {
        stage = "source_authorization";
        await authorize();
        signal.throwIfAborted();
        const content = !first
          ? "Trước câu hỏi này, bạn chưa gửi câu hỏi nào trong Notebook này."
          : !visibleSnapshot(first.sources ?? [], sources)
            ? "Câu hỏi đầu tiên gắn với nguồn hiện không được chọn hoặc đã thay đổi. Mình không thể hiển thị nội dung đó trong phạm vi nguồn hiện tại."
            : `Câu hỏi đầu tiên bạn đã gửi trong Notebook này là:\n\n${JSON.stringify(first.content)}`;
        stream.emit("delta", { text: content });

        return { content, citations: [] };
      }
      stage = "retrieval";
      const citations = directReply
        ? []
        : citeEvidence(
            (
              await retrieve(
                notebookId,
                sourceIds,
                retrievalQuestion(
                  question,
                  history,
                  intent.kind === "answer" && intent.followUp,
                ),
                signal,
              )
            ).evidence,
            sources,
          );
      signal.throwIfAborted();
      stream.emit("status", { stage: "GENERATING" });
      stage = "visual_evidence";
      const images = await visualEvidence(question, citations, sources);
      stage = "source_authorization";
      await authorize();

      stage = "model_response";

      return await generateChatResponse(
        question,
        citations,
        signal,
        (text) => stream.emit("delta", { text }),
        history,
        images,
        directReply,
      );
    } catch (error) {
      logError("notebook_generation_failed", error, {
        request_id: input.requestId,
        stage,
      });
      throw error;
    }
  }

  async history(notebookId: string, sources: Source[]) {
    const previous = await notebookMessages(
      notebookId,
      NOTEBOOK_HISTORY_LIMIT * 2,
    );

    return conversationHistory(previous.reverse(), sources);
  }
}
