import { ConflictException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { transaction } from "../../infrastructure/database/database";
import { TooManyRequestsException } from "../../common/errors/rate-limit.exception";
import type { Citation, Snapshot } from "../../common/types";

export async function startChatRequest(
  ownerId: string,
  notebookId: string,
  requestId: string,
) {
  try {
    await transaction(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,8087))",
        [ownerId],
      );
      const {
        rows: [usage],
      } = await client.query(
        `SELECT count(*) FILTER (WHERE status='RUNNING')::int active,
        count(*) FILTER (WHERE created_at>now()-interval '1 minute')::int recent
        FROM notebook_ai.requests WHERE owner_id=$1`,
        [ownerId],
      );
      if (usage.active >= 2 || usage.recent >= 10)
        throw new TooManyRequestsException(
          "Bạn đang có nhiều yêu cầu; chờ hoặc hủy câu trả lời trước.",
        );
      await client.query(
        "INSERT INTO notebook_ai.requests(id,notebook_id,owner_id) VALUES($1,$2,$3)",
        [requestId, notebookId, ownerId],
      );
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505")
      throw new ConflictException(
        "Notebook đang có câu trả lời hoặc request đã được gửi",
      );
    throw error;
  }
}

export async function completeChatRequest(
  requestId: string,
  notebookId: string,
  answer: { content: string; citations: Citation[] },
  snapshot: Snapshot[],
  artifactId?: string,
) {
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
      "INSERT INTO notebook_ai.messages(id,notebook_id,role,content,citations,sources,artifact_id) VALUES($1,$2,'ASSISTANT',$3,$4,$5,$6)",
      [
        id,
        notebookId,
        answer.content,
        JSON.stringify(answer.citations),
        JSON.stringify(snapshot),
        artifactId ?? null,
      ],
    );
    await client.query(
      "UPDATE notebook_ai.requests SET status='COMPLETED',updated_at=now() WHERE id=$1",
      [requestId],
    );
  });
  return id;
}
