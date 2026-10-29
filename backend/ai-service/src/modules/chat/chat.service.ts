import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { event } from "../../common/sse";
import { rows } from "../../infrastructure/database/database";
import { authorizeSources } from "../../infrastructure/integrations/document.client";
import { SourcesService } from "../sources/sources.service";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { citeEvidence, selectSources } from "../../common/evidence-policy";
import { retrieve } from "../../infrastructure/integrations/rag.client";
import type { Actor, Citation, Source } from "../../common/types";
import { createChatAuthorization } from "./chat-authorization";
import { config } from "../../config/env.config";

import { immediateReply, generateChatResponse } from "./chat-response";
import { visualEvidence } from "./visual-evidence";
import { startChatRequest, completeChatRequest } from "./chat-request";
import { StudioService } from "../studio/studio.service";
import { isNotebookSummaryRequest } from "./summary-request";
import {
  conversationHistory,
  isFollowUp,
  retrievalQuestion,
} from "./chat-history";

@Injectable()
export class ChatService {
  constructor(
    private readonly sources: SourcesService,
    private readonly studio: StudioService,
  ) {}
  async answer(
    actor: Actor,
    notebookId: string,
    question: string,
    sourceIds: string[],
    requestId: string,
    res: Response,
  ) {
    const controller = new AbortController();
    const disconnect = () => controller.abort();
    res.once("close", disconnect);
    try {
      if (res.destroyed) return;
      await ownedNotebook(actor, notebookId);
      const sources = await this.selectedSources(notebookId, sourceIds);
      await authorizeSources(actor, sources, false, controller.signal);
      controller.signal.throwIfAborted();
      await startChatRequest(actor.id, notebookId, requestId);
      await this.streamAnswer({
        actor,
        notebookId,
        question,
        sourceIds,
        requestId,
        res,
        sources,
        controller,
      });
    } finally {
      controller.abort();
      res.off("close", disconnect);
    }
  }

  private async selectedSources(notebookId: string, sourceIds: string[]) {
    try {
      return selectSources(sourceIds, await this.sources.sources(notebookId));
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  private async streamAnswer(input: {
    actor: Actor;
    notebookId: string;
    question: string;
    sourceIds: string[];
    requestId: string;
    res: Response;
    sources: Source[];
    controller: AbortController;
  }) {
    const { actor, notebookId, question, requestId, res, sources, controller } =
      input;
    const reply = immediateReply(question);
    const snapshot = sources.map((s) => ({ id: s.id, revision: s.revision }));
    const authorize = createChatAuthorization({
      actor,
      sources,
      snapshot,
      loadSources: () => this.sources.sources(notebookId),
      signal: controller.signal,
    });
    const check = async () => {
      const [state] = await rows(
        "SELECT status FROM notebook_ai.requests WHERE id=$1",
        [requestId],
      );
      if (state?.status !== "RUNNING") controller.abort();
    };
    let checking = false;
    const timer = setInterval(() => {
      if (checking || controller.signal.aborted) return;
      checking = true;
      void check()
        .catch(() => controller.abort())
        .finally(() => {
          checking = false;
        });
    }, config.CHAT_CANCEL_POLL_MS);
    const permissions = setInterval(() => {
      if (!controller.signal.aborted)
        void authorize().catch(() => controller.abort());
    }, 3000);
    try {
      res.status(200).set({
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      });
      res.flushHeaders();
      event(res, "status", {
        requestId,
        stage: reply ? "GENERATING" : "RETRIEVING",
      });
      controller.signal.throwIfAborted();
      const answer = await this.generateReply({
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
      if (answer.artifactId) event(res, "delta", { text: answer.content });
      event(res, "done", { id, ...answer });
    } catch (error) {
      await rows(
        "UPDATE notebook_ai.requests SET status=$2,updated_at=now() WHERE id=$1 AND status='RUNNING'",
        [requestId, controller.signal.aborted ? "CANCELLED" : "FAILED"],
      );
      event(res, "error", {
        message: controller.signal.aborted
          ? "Đã hủy câu trả lời."
          : safeError(error),
      });
    } finally {
      clearInterval(timer);
      clearInterval(permissions);
      controller.abort();
      res.end();
    }
  }
  private async generateReply(input: {
    actor: Actor;
    notebookId: string;
    question: string;
    sourceIds: string[];
    res: Response;
    sources: Source[];
    snapshot: { id: string; revision: string }[];
    controller: AbortController;
    authorize: () => Promise<void>;
  }): Promise<{ content: string; citations: Citation[]; artifactId?: string }> {
    const {
      actor,
      notebookId,
      question,
      sourceIds,
      res,
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
    await rows(
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
            await retrieve(
              notebookId,
              sourceIds,
              retrievalQuestion(question, history),
              signal,
            )
          ).evidence,
          sources,
        );
    signal.throwIfAborted();
    event(res, "status", { stage: "GENERATING" });
    const images = await visualEvidence(question, citations, sources);
    await authorize();
    return generateChatResponse(
      question,
      citations,
      signal,
      (text) => event(res, "delta", { text }),
      history,
      images,
    );
  }

  private async history(
    notebookId: string,
    question: string,
    sources: Source[],
  ) {
    if (immediateReply(question) && !isFollowUp(question)) return [];
    const previous = await rows<{
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
