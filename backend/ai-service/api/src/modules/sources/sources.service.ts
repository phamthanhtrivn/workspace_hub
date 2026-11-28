import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
import { documentPreviewUrl } from "../../infrastructure/integrations/document.client";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { rows, transaction } from "../../infrastructure/database/database";
import {
  authorizeSources,
  notebookSnapshots,
} from "../../infrastructure/integrations/document.client";
import { enqueue } from "../../infrastructure/queue/notebook.queue";
import { ownedNotebook } from "../../common/auth/notebook-access";
import { validateContent, withUploadCheck } from "./upload-validation";
import type { Actor, Manifest, Source } from "../../common/types";
import { checkCapacity, checkFile, checkManifests } from "./upload-rules";
import { downloadSource } from "./source-download";
import { deleteSource } from "../../common/delete-source";
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
          source.error = AI_UI_MESSAGES.SOURCE_ACCESS_CHANGED;
        }
      }),
    );

    return sources;
  }
  async add(
    actor: Actor,
    id: string,
    refs: { documentId: string; versionId?: string }[],
    operationId: string = randomUUID(),
  ) {
    await ownedNotebook(actor, id);
    const existingCopies = await this.sources(id);
    const manifests = [
      ...new Map(
        (
          await Promise.all(
            refs.map(async (ref, index) => {
              const existing = existingCopies.find(
                (source) =>
                  source.snapshot_id &&
                  source.document_id === ref.documentId &&
                  source.version_id === ref.versionId,
              );
              if (existing)
                return (await authorizeSources(actor, [existing]))[0];
              // One UUID per member of the batch, deterministic across transport retries.
              const child = createHash("sha256")
                .update(`${operationId}:${index}`)
                .digest("hex")
                .slice(0, 32)
                .split("");
              child[12] = "4";
              child[16] = "a";
              const childId = child
                .join("")
                .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");

              return notebookSnapshots<Manifest>("copy", {
                userId: actor.id,
                userEmail: actor.email,
                notebookId: id,
                ref: { ...ref, operationId: childId },
              });
            }),
          )
        ).map((manifest) => [
          `${manifest.documentId}:${manifest.versionId}`,
          manifest,
        ]),
      ).values(),
    ];
    const existingSources = await this.sources(id);
    const fresh = checkManifests(existingSources, manifests);
    if (fresh.length)
      await withUploadCheck(async () => {
        // Validate actual stored bytes, not a client assertion or the filename alone.
        // Resolve signed URLs just in time, so later files cannot use expired URLs.
        for (const m of fresh) {
          const [current] = await notebookSnapshots<Manifest[]>("resolve", {
            userId: actor.id,
            notebookId: id,
            ids: [m.snapshotId],
            download: true,
          });
          if (
            !current?.current ||
            current.documentId !== m.documentId ||
            current.versionId !== m.versionId ||
            current.revision !== m.revision
          )
            throw new BadRequestException(AI_UI_MESSAGES.SOURCE_RESELECT);
          await validateContent(
            current.name,
            await downloadSource(current),
            id,
          );
        }
      });

    return this.attachManifests(actor, id, manifests);
  }

  private async attachManifests(
    actor: Actor,
    id: string,
    manifests: Manifest[],
  ) {
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
          `INSERT INTO notebook_ai.sources(id,notebook_id,document_id,version_id,revision,name,size_bytes,owner_email,snapshot_id)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(notebook_id,document_id,version_id) DO UPDATE SET name=excluded.name RETURNING *`,
          [
            randomUUID(),
            id,
            m.documentId,
            m.versionId,
            m.revision,
            m.name,
            m.sizeBytes,
            actor.email,
            m.snapshotId,
          ],
        );
        result.push(source);
      }

      return result;
    });
    for (const source of added)
      if (source.status === "QUEUED")
        await enqueue("index", source.id, { sourceId: source.id });

    for (const source of added)
      if (source.snapshot_id)
        await notebookSnapshots("resolve", {
          userId: actor.id,
          notebookId: id,
          ids: [source.snapshot_id],
          retain: true,
        });

    return added;
  }

  async beginUpload(
    actor: Actor,
    id: string,
    operationId: string,
    name: string,
    mimeType: string,
    sizeBytes: number,
  ) {
    await ownedNotebook(actor, id);
    checkFile(name, sizeBytes);
    checkCapacity(await this.sources(id), 1, sizeBytes);

    return notebookSnapshots<{
      snapshotId: string;
      presignedUrl?: string;
      status: string;
    }>("upload", {
      userId: actor.id,
      notebookId: id,
      operationId,
      name,
      mimeType,
      sizeBytes,
    });
  }

  async confirmUploads(actor: Actor, id: string, snapshotIds: string[]) {
    await ownedNotebook(actor, id);
    const existing = await this.sources(id);
    const manifests = await Promise.all(
      [...new Set(snapshotIds)].map(async (snapshotId) => {
        const attached = existing.find(
          (source) => source.snapshot_id === snapshotId,
        );

        return attached
          ? (await authorizeSources(actor, [attached], true))[0]
          : notebookSnapshots<Manifest>("confirm", {
              userId: actor.id,
              notebookId: id,
              snapshotId,
            });
      }),
    );
    const fresh = checkManifests(existing, manifests);
    if (fresh.length)
      await withUploadCheck(async () => {
        for (const manifest of fresh)
          await validateContent(
            manifest.name,
            await downloadSource(manifest),
            id,
          );
      });

    return this.attachManifests(actor, id, manifests);
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
    authorization?: string,
  ) {
    await ownedNotebook(actor, id);
    const source = (await this.sources(id)).find(
      (item) => item.id === sourceId,
    );
    if (!source) throw new NotFoundException();
    if (action === "remove") {
      await deleteSource(id, sourceId);

      return {};
    }
    const [manifest] = await authorizeSources(actor, [source], false);
    if (action === "preview")
      return {
        url: source.snapshot_id
          ? (await authorizeSources(actor, [source], true))[0].downloadUrl
          : await documentPreviewUrl(manifest.documentId, authorization),
      };
    if (!["FAILED", "QUEUED", "READY"].includes(source.status))
      throw new BadRequestException(AI_UI_MESSAGES.SOURCE_PROCESSING);
    await withUploadCheck(async () => {
      const [file] = await authorizeSources(actor, [source], true);
      await validateContent(file.name, await downloadSource(file), id);
    });
    const updated = await rows(
      "UPDATE notebook_ai.sources SET status='QUEUED',error=NULL,progress=0,updated_at=now() WHERE id=$1 AND status IN ('FAILED','QUEUED','READY') RETURNING id",
      [sourceId],
    );
    if (!updated.length)
      throw new BadRequestException(
        AI_UI_MESSAGES.SOURCE_REMOVED_OR_PROCESSING,
      );
    await enqueue("index", sourceId, { sourceId });

    return {};
  }
}
