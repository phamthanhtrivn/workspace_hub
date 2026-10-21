import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { rows, transaction } from "./db";
import { authorizeSources, resolveDocuments } from "./documents";
import { visibleSnapshot } from "./policy";
import { enqueue } from "./queue";
import type { Actor, Source, Snapshot } from "./types";

@Injectable()
export class Notebooks {
  async owned(actor: Actor, id: string) {
    const [notebook] = await rows(
      "SELECT * FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2",
      [id, actor.id],
    );
    if (!notebook) throw new NotFoundException();
    return notebook;
  }
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
    await this.owned(actor, id);
    return (
      await rows(
        "UPDATE notebook_ai.notebooks SET title=$2,updated_at=now() WHERE id=$1 RETURNING *",
        [id, title],
      )
    )[0];
  }
  async remove(actor: Actor, id: string) {
    await this.owned(actor, id);
    // The cleanup job survives the notebook row deletion and is restricted to its scope.
    await enqueue("cleanup", id, { scopeId: id });
    await rows(
      "DELETE FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2",
      [id, actor.id],
    );
  }
  sources(id: string) {
    return rows<Source>(
      "SELECT * FROM notebook_ai.sources WHERE notebook_id=$1 ORDER BY created_at,id",
      [id],
    );
  }
  async checkedSources(actor: Actor, id: string) {
    const sources = await this.sources(id);
    await Promise.all(
      sources.map(async (source) => {
        try {
          await authorizeSources(actor, [source]);
        } catch (error) {
          if (!(error instanceof ForbiddenException)) throw error;
          source.status = "UNAVAILABLE";
          source.error = "Mất quyền hoặc phiên bản nguồn đã thay đổi";
        }
      }),
    );
    return sources;
  }
  async get(actor: Actor, id: string) {
    const notebook = await this.owned(actor, id);
    const sources = await this.checkedSources(actor, id);
    const messages = await rows(
      "SELECT * FROM notebook_ai.messages WHERE notebook_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100",
      [id],
    );
    const notes = await rows(
      "SELECT * FROM notebook_ai.notes WHERE notebook_id=$1 ORDER BY created_at DESC LIMIT 100",
      [id],
    );
    const artifacts = await rows(
      "SELECT id,notebook_id,kind,status,progress,content,citations,sources,error,created_at FROM notebook_ai.artifacts WHERE notebook_id=$1 ORDER BY created_at DESC LIMIT 30",
      [id],
    );
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
  async add(
    actor: Actor,
    id: string,
    refs: { documentId: string; versionId?: string }[],
  ) {
    await this.owned(actor, id);
    const manifests = await resolveDocuments(actor, refs);
    const added = await transaction(async (client) => {
      await client.query(
        "SELECT id FROM notebook_ai.notebooks WHERE id=$1 FOR UPDATE",
        [id],
      );
      const existing = await client.query<Source>(
        "SELECT * FROM notebook_ai.sources WHERE notebook_id=$1",
        [id],
      );
      const newFiles = manifests.filter(
        (m) =>
          !existing.rows.some(
            (s) =>
              s.document_id === m.documentId && s.version_id === m.versionId,
          ),
      );
      const bytes =
        existing.rows.reduce((sum, s) => sum + Number(s.size_bytes), 0) +
        newFiles.reduce((sum, m) => sum + m.sizeBytes, 0);
      if (
        existing.rows.length + newFiles.length > 5 ||
        bytes > 50 * 1024 * 1024
      )
        throw new BadRequestException("Notebook tối đa 5 file, 50 MiB");
      const result: Source[] = [];
      for (const m of manifests) {
        if (
          !m.current ||
          m.sizeBytes > 20 * 1024 * 1024 ||
          !/\.(pdf|docx|txt|md)$/i.test(m.name)
        )
          throw new BadRequestException(
            "Chỉ nhận PDF/DOCX/TXT/MD, tối đa 20 MiB, phiên bản hiện tại",
          );
        const {
          rows: [source],
        } = await client.query<Source>(
          `INSERT INTO notebook_ai.sources(id,notebook_id,document_id,version_id,revision,name,size_bytes,owner_email)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(notebook_id,document_id,version_id) DO UPDATE SET name=excluded.name RETURNING *`,
          [
            randomUUID(),
            id,
            m.documentId,
            m.versionId,
            m.revision,
            m.name,
            m.sizeBytes,
            actor.email,
          ],
        );
        result.push(source);
      }
      return result;
    });
    for (const source of added)
      if (source.status === "QUEUED")
        await enqueue("index", source.id, { sourceId: source.id });
    return added;
  }
  async sourceAction(
    actor: Actor,
    id: string,
    sourceId: string,
    action: "remove" | "retry" | "preview",
  ) {
    await this.owned(actor, id);
    const source = (await this.sources(id)).find(
      (item) => item.id === sourceId,
    );
    if (!source) throw new NotFoundException();
    if (action === "remove") {
      await enqueue("cleanup", source.id, { scopeId: id, sourceId });
      await rows("DELETE FROM notebook_ai.sources WHERE id=$1", [sourceId]);
      return {};
    }
    const [manifest] = await authorizeSources(
      actor,
      [source],
      action === "preview",
    );
    if (action === "preview") return { url: manifest.downloadUrl };
    if (!["FAILED", "QUEUED", "READY"].includes(source.status))
      throw new BadRequestException("Nguồn đang xử lý");
    await rows(
      "UPDATE notebook_ai.sources SET status='QUEUED',error=NULL,progress=0,updated_at=now() WHERE id=$1",
      [sourceId],
    );
    await enqueue("index", sourceId, { sourceId });
    return {};
  }
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
    await this.owned(actor, id);
    if (data.messageId && data.noteId)
      throw new BadRequestException("Không thể gộp ghi chú và câu trả lời");
    let content = data.content ?? "";
    let sources: Snapshot[] = [];
    let citations: unknown[] = [];
    let kind = "MANUAL";
    if (data.messageId) {
      const [message] = await rows(
        "SELECT * FROM notebook_ai.messages WHERE id=$1 AND notebook_id=$2 AND role='ASSISTANT'",
        [data.messageId, id],
      );
      if (!message) throw new NotFoundException();
      if (
        !visibleSnapshot(message.sources, await this.checkedSources(actor, id))
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
        !visibleSnapshot(note.sources, await this.checkedSources(actor, id))
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
    await this.owned(actor, id);
    await rows("DELETE FROM notebook_ai.notes WHERE id=$1 AND notebook_id=$2", [
      noteId,
      id,
    ]);
  }
  async artifact(actor: Actor, id: string, kind: string) {
    await this.owned(actor, id);
    const sources = await this.checkedSources(actor, id);
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
          prompt: "notebook-v1",
          model: process.env.LLM_MODEL,
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
