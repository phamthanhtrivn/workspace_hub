import { AiModelProvider } from "../../infrastructure/integrations/ai-model.provider";
import { AiDatabaseClient } from "../../infrastructure/database/ai-database.client";
import { ChatGenerationInput } from "./chat-stream.types";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { citeEvidence } from "../../common/evidence-policy";
import type { Citation, Source } from "../../common/types";
import { immediateReply, generateChatResponse } from "./chat-response";
import { visualEvidence } from "./visual-evidence";
import { StudioService } from "../studio/studio.service";
import { isNotebookSummaryRequest } from "./summary-request";
import {
  conversationHistory,
  isFollowUp,
  retrievalQuestion,
} from "./chat-history";

@Injectable()
export class ChatGenerationService {
  constructor(
    private readonly models: AiModelProvider,
    private readonly database: AiDatabaseClient,
    private readonly studio: StudioService,
  ) {}
  async generateReply(
    input: ChatGenerationInput,
  ): Promise<{ content: string; citations: Citation[]; artifactId?: string }> {
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
    } = input;
    const signal = controller.signal;
    const history = await this.history(notebookId, question, sources);
    signal.throwIfAborted();
    const reply = immediateReply(question);
    const directReply = history.length && isFollowUp(question) ? null : reply;
    await this.database.rows(
      "INSERT INTO notebook_ai.messages(id,notebook_id,role,content,sources) VALUES($1,$2,'USER',$3,$4)",
      [randomUUID(), notebookId, question, JSON.stringify(snapshot)],
    );
    if (isNotebookSummaryRequest(question)) {
      signal.throwIfAborted();
      const artifact = await this.studio.artifact(
        actor,
        notebookId,
        "SUMMARY",
        sourceIds,
      );
      return {
        content:
          artifact.status === "COMPLETED"
            ? artifact.content
            : "Mình đang đọc tài liệu để tóm tắt. Kết quả sẽ xuất hiện ngay tại đây khi hoàn tất.",
        citations: artifact.status === "COMPLETED" ? artifact.citations : [],
        artifactId: artifact.id,
      };
    }
    const citations = directReply
      ? []
      : citeEvidence(
          (
            await this.models.retrieve(
              notebookId,
              sourceIds,
              retrievalQuestion(question, history),
              signal,
            )
          ).evidence,
          sources,
        );
    signal.throwIfAborted();
    stream.emit("status", { stage: "GENERATING" });
    const images = await visualEvidence(question, citations, sources);
    await authorize();
    return generateChatResponse(
      question,
      citations,
      signal,
      (text) => stream.emit("delta", { text }),
      history,
      images,
    );
  }

  async history(notebookId: string, question: string, sources: Source[]) {
    if (immediateReply(question) && !isFollowUp(question)) return [];
    const previous = await this.database.rows<{
      role: string;
      content: string;
      sources: { id: string; revision: string }[];
    }>(
      `SELECT m.role, CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,m.sources
         FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id
         WHERE m.notebook_id=$1 AND (m.artifact_id IS NULL OR a.status='COMPLETED')
         AND (m.role='USER' OR jsonb_array_length(m.citations)>0 OR a.status='COMPLETED')
         ORDER BY m.created_at DESC,m.id DESC LIMIT 12`,
      [notebookId],
    );
    return conversationHistory(previous.reverse(), sources);
  }
}
