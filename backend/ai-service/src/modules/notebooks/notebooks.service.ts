import { Injectable } from "@nestjs/common";
import { rows } from "../../infrastructure/database/database";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { SourcesService } from "../sources/sources.service";
import { visibleSnapshot } from "../../common/evidence-policy";
import type { Actor, Source, Snapshot } from "../../common/types";
import { randomUUID } from "node:crypto";
import { enqueue } from "../../infrastructure/queue/notebook.queue";
@Injectable()
export class NotebooksService {
  constructor(private readonly sourcesService: SourcesService) {}
  list(actor: Actor) {
    return rows(
      "SELECT * FROM notebook_ai.notebooks WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 100",
      [actor.id],
    );
  }
  async create(actor: Actor, title: string) {
    return (
      await rows(
        "INSERT INTO notebook_ai.notebooks(id,owner_id,title) VALUES($1,$2,$3) RETURNING *",
        [randomUUID(), actor.id, title],
      )
    )[0];
  }
  async rename(actor: Actor, id: string, title: string) {
    await ownedNotebook(actor, id);
    return (
      await rows(
        "UPDATE notebook_ai.notebooks SET title=$2,updated_at=now() WHERE id=$1 RETURNING *",
        [id, title],
      )
    )[0];
  }
  async remove(actor: Actor, id: string) {
    await ownedNotebook(actor, id);
    // The cleanup job survives the notebook row deletion and is restricted to its scope.
    await enqueue("cleanup", id, { scopeId: id });
    await rows(
      "DELETE FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2",
      [id, actor.id],
    );
  }
  async get(actor: Actor, id: string) {
    const notebook = await ownedNotebook(actor, id);
    const sources = await this.sourcesService.checkedSources(actor, id);
    const [messages, notes, artifacts] = await Promise.all([
      rows(
        `SELECT m.*, a.status AS summary_status,
          CASE WHEN a.status='COMPLETED' THEN a.content ELSE m.content END AS content,
          CASE WHEN a.status='COMPLETED' THEN a.citations ELSE m.citations END AS citations,
          a.error AS summary_error
         FROM notebook_ai.messages m LEFT JOIN notebook_ai.artifacts a ON a.id=m.artifact_id
         WHERE m.notebook_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 100`,
        [id],
      ),
      rows(
        "SELECT * FROM notebook_ai.notes WHERE notebook_id=$1 ORDER BY created_at DESC LIMIT 100",
        [id],
      ),
      rows(
        "SELECT id,notebook_id,kind,status,progress,content,citations,sources,error,created_at FROM notebook_ai.artifacts WHERE notebook_id=$1 ORDER BY created_at DESC LIMIT 30",
        [id],
      ),
    ]);
    const mask = (item: Record<string, unknown>) =>
      visibleSnapshot(item.sources as Snapshot[], sources)
        ? item
        : {
            ...item,
            content: "",
            citations: [],
            status: "STALE",
            hidden: true,
          };
    return {
      ...notebook,
      sources: sources.map(
        ({
          owner_email: _email,
          ...source
        }: Source & { owner_email?: string }) => source,
      ),
      messages: messages.reverse().map(mask),
      notes: notes.map(mask),
      artifacts: artifacts.map(mask),
    };
  }
}
