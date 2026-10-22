import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { rows } from "../../infrastructure/database/database";
import { authorizeSources } from "../../infrastructure/integrations/document.client";
import { SourcesService } from "../sources/sources.service";
import { ownedNotebook } from "../../common/auth/notebook-access";
import {
  citeEvidence,
  selectSources,
  visibleSnapshot,
} from "../../common/evidence-policy";
import { retrieve } from "../../infrastructure/integrations/rag.client";
import type { Actor, Source } from "../../common/types";

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

export function event(res: Response, name: string, data: unknown) {
  if (!res.destroyed)
    res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

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
    await ownedNotebook(actor, notebookId);
    const reply = immediateReply(question);
    let sources: Source[];
    try {
      sources = selectSources(
        sourceIds,
        await this.sources.sources(notebookId),
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    await authorizeSources(actor, sources);
    await startChatRequest(actor.id, notebookId, requestId);
    const controller = new AbortController();
    const disconnect = () => controller.abort();
    res.on("close", disconnect);
    const snapshot = sources.map((s) => ({ id: s.id, revision: s.revision }));
    const authorize = async () => {
      if (!visibleSnapshot(snapshot, await this.sources.sources(notebookId)))
        throw new Error("Nguồn đã thay đổi");
      await authorizeSources(actor, sources);
    };
    if (res.destroyed) controller.abort();
    const check = async () => {
      const [state] = await rows(
        "SELECT status FROM notebook_ai.requests WHERE id=$1",
        [requestId],
      );
      if (state?.status !== "RUNNING") controller.abort();
    };
    let checking = false;
    const timer = setInterval(() => {
      if (checking) return;
      checking = true;
      void check()
        .catch(() => controller.abort())
        .finally(() => {
          checking = false;
        });
    }, 500);
    let authorizing = false;
    const permissions = setInterval(() => {
      if (authorizing) return;
      authorizing = true;
      void authorize()
        .catch(() => controller.abort())
        .finally(() => {
          authorizing = false;
        });
    }, 3000);
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
    try {
      const previous =
        reply && !isFollowUp(question)
          ? []
          : await rows(
              `SELECT m.role, CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,m.sources
         FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id
         WHERE m.notebook_id=$1 AND (m.artifact_id IS NULL OR a.status='COMPLETED')
         AND (m.role='USER' OR jsonb_array_length(m.citations)>0 OR a.status='COMPLETED')
         ORDER BY m.created_at DESC,m.id DESC LIMIT 12`,
              [notebookId],
            );
      const history = conversationHistory(
        previous.reverse() as {
          role: string;
          content: string;
          sources: { id: string; revision: string }[];
        }[],
        sources,
      );
      const directReply = history.length && isFollowUp(question) ? null : reply;
      await rows(
        "INSERT INTO notebook_ai.messages(id,notebook_id,role,content,sources) VALUES($1,$2,'USER',$3,$4)",
        [randomUUID(), notebookId, question, JSON.stringify(snapshot)],
      );
      if (isNotebookSummaryRequest(question)) {
        controller.signal.throwIfAborted();
        const artifact = await this.studio.artifact(
          actor,
          notebookId,
          "SUMMARY",
          sourceIds,
        );
        await authorize();
        controller.signal.throwIfAborted();
        const answer = {
          content:
            artifact.status === "COMPLETED"
              ? artifact.content
              : "Mình đang đọc tài liệu để tóm tắt. Kết quả sẽ xuất hiện ngay tại đây khi hoàn tất.",
          citations: artifact.status === "COMPLETED" ? artifact.citations : [],
        };
        const id = await completeChatRequest(
          requestId,
          notebookId,
          answer,
          snapshot,
          artifact.id,
        );
        event(res, "delta", { text: answer.content });
        event(res, "done", { id, ...answer, artifactId: artifact.id });
        return;
      }
      const citations = directReply
        ? []
        : citeEvidence(
            (
              await retrieve(
                notebookId,
                sourceIds,
                retrievalQuestion(question, history),
                controller.signal,
              )
            ).evidence,
            sources,
          );
      await authorize();
      controller.signal.throwIfAborted();
      event(res, "status", { stage: "GENERATING" });
      const images = await visualEvidence(question, citations, sources);
      await authorize();
      const answer = await generateChatResponse(
        question,
        citations,
        controller.signal,
        (text) => event(res, "delta", { text }),
        history,
        images,
      );
      await authorize();
      controller.signal.throwIfAborted();
      const id = await completeChatRequest(
        requestId,
        notebookId,
        answer,
        snapshot,
      );
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
      res.off("close", disconnect);
      controller.abort();
      res.end();
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
export function safeError(error: unknown) {
  const message = (error as Error)?.message ?? "";
  if (
    /hạn mức|HTTP \d{3}|bị cắt|trích dẫn|thiếu trích|phiên bản|Mất quyền/i.test(
      message,
    )
  )
    return message;
  return "AI chưa hoàn tất yêu cầu. Kiểm tra kết nối/model và thử lại; yêu cầu không được tự gửi lại.";
}
