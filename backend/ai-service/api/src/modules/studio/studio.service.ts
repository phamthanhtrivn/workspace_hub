import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { rows } from "../../infrastructure/database/database";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { SourcesService } from "../sources/sources.service";
import { visibleSnapshot } from "../../common/evidence-policy";
import type { Actor, Snapshot } from "../../common/types";
import { randomUUID } from "node:crypto";
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
}
