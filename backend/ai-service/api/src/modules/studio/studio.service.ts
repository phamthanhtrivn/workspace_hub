import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { rows } from "../../infrastructure/database/database";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { SourcesService } from "../sources/sources.service";
import { selectSources, visibleSnapshot } from "../../common/evidence-policy";
import type { Actor, Snapshot } from "../../common/types";
import { createHash, randomUUID } from "node:crypto";
import { enqueue } from "../../infrastructure/queue/notebook.queue";
import { config } from "../../config/env.config";
@Injectable()
export class StudioService {
  constructor(private readonly sourcesService: SourcesService) {}
  async note(
    actor: Actor,
    id: string,
    data: {
      title: string;
      content?: string;
      messageId?: string;
      noteId?: string;
    },
  ) {
    await ownedNotebook(actor, id);
    if (data.messageId && data.noteId)
      throw new BadRequestException("Không thể gộp ghi chú và câu trả lời");
    let content = data.content ?? "";
    let sources: Snapshot[] = [];
    let citations: unknown[] = [];
    let kind = "MANUAL";
    if (data.messageId) {
      const [message] = await rows(
        `SELECT m.*,a.status AS summary_status,
          CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,
          CASE WHEN a.status='COMPLETED' THEN a.citations ELSE m.citations END AS citations
         FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id
         WHERE m.id=$1 AND m.notebook_id=$2 AND m.role='ASSISTANT'`,
        [data.messageId, id],
      );
      if (!message) throw new NotFoundException();
      if (message.artifact_id && message.summary_status !== "COMPLETED")
        throw new BadRequestException(
          "Chờ bản tóm tắt hoàn tất trước khi lưu ghi chú.",
        );
      if (
        !visibleSnapshot(
          message.sources,
          await this.sourcesService.checkedSources(actor, id),
        )
      )
        throw new ForbiddenException();
      content = message.content;
      sources = message.sources;
      citations = message.citations;
      kind = "SAVED_AI";
    }
    if (data.noteId) {
      const [note] = await rows(
        "SELECT * FROM notebook_ai.notes WHERE id=$1 AND notebook_id=$2",
        [data.noteId, id],
      );
      if (
        !note ||
        !visibleSnapshot(
          note.sources,
          await this.sourcesService.checkedSources(actor, id),
        )
      )
        throw new NotFoundException();
      return (
        await rows(
          "UPDATE notebook_ai.notes SET title=$3,content=$4,updated_at=now() WHERE id=$1 AND notebook_id=$2 RETURNING *",
          [data.noteId, id, data.title, content],
        )
      )[0];
    }
    return (
      await rows(
        "INSERT INTO notebook_ai.notes(id,notebook_id,title,content,sources,citations,kind) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          randomUUID(),
          id,
          data.title,
          content,
          JSON.stringify(sources),
          JSON.stringify(citations),
          kind,
        ],
      )
    )[0];
  }
  async deleteNote(actor: Actor, id: string, noteId: string) {
    await ownedNotebook(actor, id);
    await rows("DELETE FROM notebook_ai.notes WHERE id=$1 AND notebook_id=$2", [
      noteId,
      id,
    ]);
  }
  async artifact(actor: Actor, id: string, kind: string, sourceIds?: string[]) {
    await ownedNotebook(actor, id);
    const available = await this.sourcesService.checkedSources(actor, id);
    let sources = available;
    if (sourceIds) {
      try {
        sources = selectSources(sourceIds, available);
      } catch (cause) {
        throw new BadRequestException((cause as Error).message);
      }
    }
    if (!sources.length || sources.some((s) => s.status !== "READY"))
      throw new BadRequestException(
        "Chờ tất cả nguồn sẵn sàng trước khi tạo tổng quan",
      );
    const snapshot = sources.map((s) => ({ id: s.id, revision: s.revision }));
    const key = createHash("sha256")
      .update(
        JSON.stringify({
          snapshot,
          kind,
          prompt: "source-key-points-v3",
          ...(sources.some((source) => source.index_version === "visual-v1")
            ? { visualPipeline: "visual-v1" }
            : {}),
          provider: config.LLM_BASE_URL.replace(/\/$/, ""),
          model: config.LLM_MODEL,
          maxTokens: config.LLM_MAX_TOKENS,
          language: "vi",
        }),
      )
      .digest("hex");
    const [artifact] = await rows(
      `INSERT INTO notebook_ai.artifacts(id,notebook_id,kind,cache_key,sources,owner_email) VALUES($1,$2,$3,$4,$5,$6)
      ON CONFLICT(notebook_id,cache_key) DO UPDATE SET
      in_flight=CASE WHEN notebook_ai.artifacts.status IN ('FAILED','CANCELLED') THEN false ELSE notebook_ai.artifacts.in_flight END,
      status=CASE WHEN notebook_ai.artifacts.status IN ('FAILED','CANCELLED') THEN 'QUEUED' ELSE notebook_ai.artifacts.status END,error=NULL RETURNING *`,
      [randomUUID(), id, kind, key, JSON.stringify(snapshot), actor.email],
    );
    if (artifact.status === "QUEUED")
      await enqueue("summary", artifact.id, { artifactId: artifact.id });
    return artifact;
  }
}
