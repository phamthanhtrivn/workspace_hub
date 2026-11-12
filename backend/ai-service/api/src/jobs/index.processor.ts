import { UnrecoverableError } from "bullmq";
import { randomUUID } from "node:crypto";
import { HttpException } from "@nestjs/common";
import { rows } from "../infrastructure/database/database";
import { authorizeSources } from "../infrastructure/integrations/document.client";
import { rag } from "../infrastructure/integrations/rag.client";
import type { Source } from "../common/types";
import { downloadSource } from "../modules/sources/source-download";
import { Profile } from "../common/profiling/pipeline-profiler";
import { config } from "../config/env.config";
import { enrichVisualSource } from "./visual-ingestion";
export async function indexSource(id: string) {
  const runId = randomUUID();
  const [source] = await rows<
    Source & { owner_id: string; owner_email: string }
  >(
    `UPDATE notebook_ai.sources s SET status='INDEXING',run_id=$2,progress=10,error=NULL,updated_at=now()
     FROM notebook_ai.notebooks n WHERE s.id=$1 AND n.id=s.notebook_id AND s.status IN ('QUEUED','FAILED')
     RETURNING s.*,n.owner_id`,
    [id, runId],
  );
  if (!source || source.status === "READY") return;
  const actor = { id: source.owner_id, email: source.owner_email };
  const timing = new Profile("index");
  let completed = false;
  let visualAttempt = false;
  try {
    const [manifest] = await timing.measure("authorize_ms", () =>
      authorizeSources(actor, [source], true),
    );
    const data = await timing.measure("download_ms", () =>
      downloadSource(manifest),
    );
    if (data.length !== Number(source.size_bytes))
      throw new UnrecoverableError("Kích thước phiên bản nguồn không khớp");
    await rows(
      "UPDATE notebook_ai.sources SET progress=30,updated_at=now() WHERE id=$1 AND run_id=$2 AND status='INDEXING'",
      [id, runId],
    );
    const content = await timing.measure("encode_ms", () =>
      data.toString("base64"),
    );
    visualAttempt =
      config.VISUAL_ENABLED === "true" &&
      /\.(pdf|docx|png|jpe?g|webp)$/i.test(source.name);
    const enriched = visualAttempt
      ? await enrichVisualSource(source, actor, content)
      : {};
    await rows(
      "UPDATE notebook_ai.sources SET progress=85,updated_at=now() WHERE id=$1 AND run_id=$2 AND status='INDEXING'",
      [id, runId],
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
        AbortSignal.timeout(config.NOTEBOOK_INDEX_TIMEOUT_MS),
      ),
    );
    await timing.measure("authorize_ms", () =>
      authorizeSources(actor, [source]),
    );
    const updated = await timing.measure("finalize_ms", () =>
      rows(
        "UPDATE notebook_ai.sources SET status='READY',progress=100,chunk_count=$2,index_version=$3,updated_at=now() WHERE id=$1 AND run_id=$4 AND status='INDEXING' RETURNING id",
        [
          id,
          result.chunkCount,
          "pages" in enriched ? "visual-v1" : "text-v1",
          runId,
        ],
      ),
    );
    if (!updated.length) {
      const [existing] = await rows(
        "SELECT id FROM notebook_ai.sources WHERE id=$1",
        [id],
      );
      if (!existing)
        await rag("/delete", { scopeId: source.notebook_id, sourceId: id });
    }
    completed = true;
  } catch (error) {
    const failure =
      error instanceof HttpException &&
      error.getStatus() >= 400 &&
      error.getStatus() < 500 &&
      error.getStatus() !== 429
        ? new UnrecoverableError(error.message)
        : error;
    await rows(
      "UPDATE notebook_ai.sources SET status='FAILED',error=$2,updated_at=now() WHERE id=$1 AND run_id=$3 AND status='INDEXING'",
      [
        id,
        failure instanceof UnrecoverableError
          ? failure.message
          : failure instanceof Error && "getStatus" in failure
            ? failure.message
            : "INDEX_DEPENDENCY_FAILED: Không tải hoặc xử lý được nguồn. Kiểm tra Document Service, RAG worker và bộ nhớ; thử lại khi dịch vụ sẵn sàng.",
        runId,
      ],
    );
    if (visualAttempt && !(failure instanceof UnrecoverableError))
      throw new UnrecoverableError(
        "VISUAL_INDEX_INTERRUPTED: Completed images are saved. Retry explicitly after checking the source error.",
      );
    throw failure;
  } finally {
    timing.finish(completed ? "ok" : "failed");
  }
}
