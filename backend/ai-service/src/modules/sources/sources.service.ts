import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { rows, transaction } from "../../infrastructure/database/database";
import {
  authorizeSources,
  resolveDocuments,
} from "../../infrastructure/integrations/document.client";
import { enqueue } from "../../infrastructure/queue/notebook.queue";
import { ownedNotebook } from "../../common/auth/notebook-access";
import {
  checkManifests,
  downloadSource,
  validateContent,
  withUploadCheck,
} from "./upload-validation";
import type { Actor, Source } from "../../common/types";
@Injectable()
export class SourcesService {
  sources(id: string) {
    return rows<Source>(
      "SELECT * FROM notebook_ai.sources WHERE notebook_id=$1 ORDER BY created_at,id",
      [id],
    );
  }
  async checkedSources(actor: Actor, id: string) {
    const sources = await this.sources(id);
    if (sources.length > 1) {
      try {
        await authorizeSources(actor, sources);
        return sources;
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error;
        // Identify revoked/changed files individually only after a batch denial.
      }
    }
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
  async add(
    actor: Actor,
    id: string,
    refs: { documentId: string; versionId?: string }[],
  ) {
    await ownedNotebook(actor, id);
    const manifests = await resolveDocuments(actor, refs);
    const existingSources = await this.sources(id);
    checkManifests(existingSources, manifests);
    await withUploadCheck(async () => {
      // Validate actual stored bytes, not a client assertion or the filename alone.
      // Resolve signed URLs just in time, so later files cannot use expired URLs.
      for (const m of manifests) {
        const [current] = await resolveDocuments(
          actor,
          [{ documentId: m.documentId, versionId: m.versionId }],
          true,
        );
        if (
          !current?.current ||
          current.documentId !== m.documentId ||
          current.versionId !== m.versionId ||
          current.revision !== m.revision
        )
          throw new BadRequestException(
            "Nguồn đã thay đổi. Hãy chọn lại tài liệu.",
          );
        await validateContent(current.name, await downloadSource(current), id);
      }
    });
    const added = await transaction(async (client) => {
      const locked = await client.query(
        "SELECT id FROM notebook_ai.notebooks WHERE id=$1 AND owner_id=$2 FOR UPDATE",
        [id, actor.id],
      );
      if (!locked.rows.length) throw new NotFoundException();
      const existing = await client.query<Source>(
        "SELECT * FROM notebook_ai.sources WHERE notebook_id=$1",
        [id],
      );
      checkManifests(existing.rows, manifests);
      const result: Source[] = [];
      for (const m of manifests) {
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
  async visual(actor: Actor, id: string, sourceId: string, imageId: string) {
    await ownedNotebook(actor, id);
    const source = (await this.sources(id)).find(
      (item) => item.id === sourceId && item.status === "READY",
    );
    if (!source || !/^[a-f0-9]{64}$/.test(imageId))
      throw new NotFoundException();
    await authorizeSources(actor, [source]);
    const [image] = await rows<{ data_url: string; description: string }>(
      "SELECT data_url,description FROM notebook_ai.source_visuals WHERE source_id=$1 AND revision=$2 AND image_id=$3",
      [source.id, source.revision, imageId],
    );
    if (!image) throw new NotFoundException();
    await authorizeSources(actor, [source]);
    return { dataUrl: image.data_url, description: image.description };
  }
  async sourceAction(
    actor: Actor,
    id: string,
    sourceId: string,
    action: "remove" | "retry" | "preview",
  ) {
    await ownedNotebook(actor, id);
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
    await withUploadCheck(async () => {
      const [file] = await authorizeSources(actor, [source], true);
      await validateContent(file.name, await downloadSource(file), id);
    });
    await rows(
      "UPDATE notebook_ai.sources SET status='QUEUED',error=NULL,progress=0,updated_at=now() WHERE id=$1",
      [sourceId],
    );
    await enqueue("index", sourceId, { sourceId });
    return {};
  }
}
