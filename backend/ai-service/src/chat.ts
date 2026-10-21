import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { rows, transaction } from "./db";
import { authorizeSources } from "./documents";
import { Notebooks } from "./notebooks";
import {
  citeEvidence,
  selectSources,
  validateCitations,
  visibleSnapshot,
} from "./policy";
import { retrieve } from "./rag";
import { modelAnswer } from "./model";
import { TooManyRequestsException } from "./rate-error";
import type { Actor, Source } from "./types";

export function event(res: Response, name: string, data: unknown) {
  if (!res.destroyed)
    res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

@Injectable()
export class Chat {
  constructor(private readonly notebooks: Notebooks) {}
  async answer(
    actor: Actor,
    notebookId: string,
    question: string,
    sourceIds: string[],
    requestId: string,
    res: Response,
  ) {
    await this.notebooks.owned(actor, notebookId);
    let sources: Source[];
    try {
      sources = selectSources(
        sourceIds,
        await this.notebooks.sources(notebookId),
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    await authorizeSources(actor, sources);
    try {
      await transaction(async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,8087))",
          [actor.id],
        );
        const {
          rows: [usage],
        } = await client.query(
          `SELECT count(*) FILTER (WHERE status='RUNNING')::int active,
          count(*) FILTER (WHERE created_at>now()-interval '1 minute')::int recent FROM notebook_ai.requests WHERE owner_id=$1`,
          [actor.id],
        );
        if (usage.active >= 2 || usage.recent >= 10)
          throw new TooManyRequestsException(
            "Bạn đang có nhiều yêu cầu; chờ hoặc hủy câu trả lời trước.",
          );
        await client.query(
          "INSERT INTO notebook_ai.requests(id,notebook_id,owner_id) VALUES($1,$2,$3)",
          [requestId, notebookId, actor.id],
        );
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505")
        throw new ConflictException(
          "Notebook đang có câu trả lời hoặc request đã được gửi",
        );
      throw error;
    }
    const controller = new AbortController();
    const disconnect = () => controller.abort();
    res.on("close", disconnect);
    const snapshot = sources.map((s) => ({ id: s.id, revision: s.revision }));
    const authorize = async () => {
      if (!visibleSnapshot(snapshot, await this.notebooks.sources(notebookId)))
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
    event(res, "status", { requestId, stage: "RETRIEVING" });
    try {
      await rows(
        "INSERT INTO notebook_ai.messages(id,notebook_id,role,content,sources) VALUES($1,$2,'USER',$3,$4)",
        [randomUUID(), notebookId, question, JSON.stringify(snapshot)],
      );
      const result = await retrieve(
        notebookId,
        sourceIds,
        question,
        controller.signal,
      );
      const citations = citeEvidence(result.evidence, sources);
      await authorize();
      controller.signal.throwIfAborted();
      event(res, "status", { stage: "GENERATING" });
      let content = "";
      if (!citations.length) {
        content =
          "Chưa tìm thấy thông tin phù hợp trong những nguồn đã chọn. Hãy hỏi cụ thể hơn hoặc thêm tài liệu.";
        event(res, "delta", { text: content });
      } else {
        for await (const delta of modelAnswer(
          question,
          citations,
          controller.signal,
        )) {
          controller.signal.throwIfAborted();
          content += delta;
          if (content.length > 20000) throw new Error("Câu trả lời quá dài");
          event(res, "delta", { text: delta });
        }
      }
      const used = citations.length
        ? validateCitations(content, citations)
        : [];
      await authorize();
      controller.signal.throwIfAborted();
      const id = randomUUID();
      await transaction(async (client) => {
        const {
          rows: [request],
        } = await client.query(
          "SELECT status FROM notebook_ai.requests WHERE id=$1 FOR UPDATE",
          [requestId],
        );
        if (request?.status !== "RUNNING") throw new Error("Yêu cầu đã hủy");
        await client.query(
          "INSERT INTO notebook_ai.messages(id,notebook_id,role,content,citations,sources) VALUES($1,$2,'ASSISTANT',$3,$4,$5)",
          [
            id,
            notebookId,
            content,
            JSON.stringify(used),
            JSON.stringify(snapshot),
          ],
        );
        await client.query(
          "UPDATE notebook_ai.requests SET status='COMPLETED',updated_at=now() WHERE id=$1",
          [requestId],
        );
      });
      event(res, "done", { id, content, citations: used });
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
