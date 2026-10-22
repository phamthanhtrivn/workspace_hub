import { UnrecoverableError } from "bullmq";
import { HttpException } from "@nestjs/common";
import { rows } from "../infrastructure/database/database";
import { authorizeSources } from "../infrastructure/integrations/document.client";
import { rag } from "../infrastructure/integrations/rag.client";
import type { Source } from "../common/types";
import { downloadSource } from "../modules/sources/upload-validation";
import { Profile } from "../common/profiling/pipeline-profiler";
import { config } from "../config/env.config";
import { enrichVisualSource } from "./visual-ingestion";
export async function indexSource(id: string) {
  const [source] = await rows<
    Source & { owner_id: string; owner_email: string }
  >(
    `SELECT s.*,n.owner_id FROM notebook_ai.sources s
    JOIN notebook_ai.notebooks n ON n.id=s.notebook_id WHERE s.id=$1`,
    [id],
  );
  if (!source || source.status === "READY") return;
  const actor = { id: source.owner_id, email: source.owner_email };
  const timing = new Profile("index");
  let completed = false;
  try {
    const [manifest] = await timing.measure("authorize_ms", () =>
      authorizeSources(actor, [source], true),
    );
    await rows(
      "UPDATE notebook_ai.sources SET status='INDEXING',progress=10,error=NULL,updated_at=now() WHERE id=$1",
      [id],
    );
    const data = await timing.measure("download_ms", () =>
      downloadSource(manifest),
    );
    if (data.length !== Number(source.size_bytes))
      throw new UnrecoverableError("Kích thước phiên bản nguồn không khớp");
    await rows(
      "UPDATE notebook_ai.sources SET progress=30,updated_at=now() WHERE id=$1 AND status='INDEXING'",
      [id],
    );
    const content = await timing.measure("encode_ms", () =>
      data.toString("base64"),
    );
    const enriched =
      config.VISUAL_ENABLED === "true" &&
      /\.(pdf|docx|png|jpe?g|webp)$/i.test(source.name)
        ? await enrichVisualSource(source, actor, content)
        : {};
    await rows(
      "UPDATE notebook_ai.sources SET progress=85,updated_at=now() WHERE id=$1 AND status='INDEXING'",
      [id],
    );
    const result = await timing.measure("rag_ms", () =>
      rag<{ chunkCount: number }>(
        "/index",
        {
          scopeId: source.notebook_id,
          sourceId: id,
          revision: source.revision,
          name: source.name,
          content,
          ...enriched,
        },
        AbortSignal.timeout(240000),
      ),
    );
    await timing.measure("authorize_ms", () =>
      authorizeSources(actor, [source]),
    );
    const updated = await timing.measure("finalize_ms", () =>
      rows(
        "UPDATE notebook_ai.sources SET status='READY',progress=100,chunk_count=$2,index_version=$3,updated_at=now() WHERE id=$1 RETURNING id",
        [id, result.chunkCount, "pages" in enriched ? "visual-v1" : "text-v1"],
      ),
    );
    if (!updated.length)
      await rag("/delete", { scopeId: source.notebook_id, sourceId: id });
    completed = true;
  } catch (error) {
    if (
      error instanceof HttpException &&
      error.getStatus() >= 400 &&
      error.getStatus() < 500 &&
      error.getStatus() !== 429
    )
      error = new UnrecoverableError(error.message);
    await rows(
      "UPDATE notebook_ai.sources SET status='FAILED',error=$2,updated_at=now() WHERE id=$1",
      [
        id,
        error instanceof UnrecoverableError
          ? error.message
          : error instanceof Error && "getStatus" in error
            ? error.message
            : "INDEX_DEPENDENCY_FAILED: Không tải hoặc xử lý được nguồn. Kiểm tra Document Service, RAG worker và bộ nhớ; thử lại khi dịch vụ sẵn sàng.",
      ],
    );
    throw error;
  } finally {
    timing.finish(completed ? "ok" : "failed");
  }
}
