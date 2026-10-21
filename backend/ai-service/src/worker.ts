import { Worker, UnrecoverableError } from "bullmq";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { config, connection } from "./config";
import { db, rows } from "./db";
import { authorizeSources } from "./documents";
import { modelAnswer } from "./model";
import { Notebooks } from "./notebooks";
import {
  citeEvidence,
  validateCitations,
  visibleSnapshot,
  summaryGroups,
  snapshotSources,
} from "./policy";
import { enqueue, queue } from "./queue";
import { rag } from "./rag";
import type { Actor, Citation, Evidence, Snapshot, Source } from "./types";

const notebooks = new Notebooks();
async function indexSource(id: string) {
  const [source] = await rows<
    Source & { owner_id: string; owner_email: string }
  >(
    `SELECT s.*,n.owner_id FROM notebook_ai.sources s
    JOIN notebook_ai.notebooks n ON n.id=s.notebook_id WHERE s.id=$1`,
    [id],
  );
  if (!source || source.status === "READY") return;
  const actor = { id: source.owner_id, email: source.owner_email };
  try {
    const [manifest] = await authorizeSources(actor, [source], true);
    await rows(
      "UPDATE notebook_ai.sources SET status='INDEXING',progress=10,error=NULL,updated_at=now() WHERE id=$1",
      [id],
    );
    const response = await fetch(manifest.downloadUrl!, {
      signal: AbortSignal.timeout(30000),
      redirect: "error",
    });
    if (!response.ok || !response.body)
      throw new Error("Không tải được file gốc");
    const reader = response.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 20 * 1024 * 1024)
          throw new UnrecoverableError("File vượt 20 MiB");
        parts.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (size !== Number(source.size_bytes))
      throw new UnrecoverableError("Kích thước phiên bản nguồn không khớp");
    const result = await rag<{ chunkCount: number }>(
      "/index",
      {
        scopeId: source.notebook_id,
        sourceId: id,
        revision: source.revision,
        name: source.name,
        content: Buffer.concat(parts).toString("base64"),
      },
      AbortSignal.timeout(240000),
    );
    await authorizeSources(actor, [source]);
    const updated = await rows(
      "UPDATE notebook_ai.sources SET status='READY',progress=100,chunk_count=$2,updated_at=now() WHERE id=$1 RETURNING id",
      [id, result.chunkCount],
    );
    if (!updated.length)
      await rag("/delete", { scopeId: source.notebook_id, sourceId: id });
  } catch (error) {
    if (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException
    )
      error = new UnrecoverableError(error.message);
    await rows(
      "UPDATE notebook_ai.sources SET status='FAILED',error=$2,updated_at=now() WHERE id=$1",
      [
        id,
        error instanceof UnrecoverableError
          ? error.message
          : "Không lập chỉ mục được. Kiểm tra worker, embedding và quyền đọc file.",
      ],
    );
    throw error;
  }
}

type Section = { content: string; citations: Citation[] };
async function summarize(id: string) {
  const [artifact] = await rows(
    `SELECT a.*,n.owner_id FROM notebook_ai.artifacts a JOIN notebook_ai.notebooks n ON n.id=a.notebook_id WHERE a.id=$1`,
    [id],
  );
  if (!artifact || ["COMPLETED", "CANCELLED"].includes(artifact.status)) return;
  if (artifact.in_flight) {
    await rows(
      "UPDATE notebook_ai.artifacts SET status='FAILED',error='Worker bị gián đoạn khi gọi model. Chủ động tiếp tục để chạy lại phần chưa checkpoint.' WHERE id=$1",
      [id],
    );
    throw new UnrecoverableError("Previous provider outcome unknown");
  }
  const actor: Actor = { id: artifact.owner_id, email: artifact.owner_email };
  let sources: Source[];
  try {
    sources = snapshotSources(
      artifact.sources as Snapshot[],
      await notebooks.sources(artifact.notebook_id),
    );
    await authorizeSources(actor, sources);
  } catch {
    await rows(
      "UPDATE notebook_ai.artifacts SET status='FAILED',error='Không xác minh được snapshot nguồn. Kiểm tra quyền và phiên bản trước khi tiếp tục.' WHERE id=$1",
      [id],
    );
    throw new UnrecoverableError("Source snapshot unavailable");
  }
  const controller = new AbortController();
  let checking = false;
  const timer = setInterval(() => {
    if (checking) return;
    checking = true;
    void (async () => {
      const [state] = await rows(
        "SELECT status FROM notebook_ai.artifacts WHERE id=$1",
        [id],
      );
      if (!state || state.status === "CANCELLED") controller.abort();
      if (
        !visibleSnapshot(
          artifact.sources,
          await notebooks.sources(artifact.notebook_id),
        )
      )
        controller.abort();
      await authorizeSources(actor, sources);
    })()
      .catch(() => controller.abort())
      .finally(() => {
        checking = false;
      });
  }, 1000);
  try {
    await rows(
      "UPDATE notebook_ai.artifacts SET status='RUNNING',error=NULL,updated_at=now() WHERE id=$1 AND status<>'CANCELLED'",
      [id],
    );
    const { evidence } = await rag<{ evidence: Evidence[] }>(
      "/chunks",
      { scopeId: artifact.notebook_id, sourceIds: sources.map((s) => s.id) },
      AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
    );
    if (
      sources.some(
        (s) =>
          evidence.filter((e) => e.sourceId === s.id).length !== s.chunk_count,
      )
    )
      throw new Error("Chỉ mục thiếu phần; cần lập lại chỉ mục");
    const all = citeEvidence(evidence, sources);
    // Overview explicitly samples excerpts; full summary visits every indexed chunk.
    const selected =
      artifact.kind === "OVERVIEW"
        ? sources.flatMap((s) =>
            all.filter((e) => e.sourceId === s.id).slice(0, 2),
          )
        : all;
    const groups = summaryGroups(selected);
    const sections = artifact.sections as Section[];
    for (let i = sections.length; i < groups.length; i++) {
      controller.signal.throwIfAborted();
      await authorizeSources(actor, sources);
      const question =
        artifact.kind === "OVERVIEW"
          ? "Viết tổng quan ngắn từ các đoạn trích, nói rõ đây không phải tóm tắt toàn văn; kết thúc bằng 3 câu hỏi gợi ý dựa trên nội dung."
          : `Tóm tắt tiếng Việt phần ${i + 1}/${groups.length}. Giữ ý chính, số liệu và mâu thuẫn. Trích dẫn đúng nhãn được cung cấp.`;
      let content = "";
      await rows(
        "UPDATE notebook_ai.artifacts SET in_flight=true WHERE id=$1 AND status='RUNNING'",
        [id],
      );
      for await (const delta of modelAnswer(
        question,
        groups[i],
        controller.signal,
      )) {
        content += delta;
        if (content.length > 20000) throw new Error("Kết quả vượt giới hạn");
      }
      const citations = validateCitations(content, groups[i]);
      sections.push({ content, citations });
      await rows(
        "UPDATE notebook_ai.artifacts SET sections=$2,progress=$3,in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING'",
        [
          id,
          JSON.stringify(sections),
          Math.round((sections.length * 100) / groups.length),
        ],
      );
    }
    controller.signal.throwIfAborted();
    await authorizeSources(actor, sources);
    if (!sections.length || sections.length !== groups.length)
      throw new Error("Chưa đọc đủ các phần");
    const heading =
      artifact.kind === "OVERVIEW"
        ? "Tổng quan theo đoạn trích (không phải toàn văn)"
        : `Tóm tắt theo ${groups.length} phần — đã xử lý ${all.length} đoạn chỉ mục`;
    await rows(
      `UPDATE notebook_ai.artifacts SET status='COMPLETED',progress=100,content=$2,citations=$3,updated_at=now()
      WHERE id=$1 AND status='RUNNING'`,
      [
        id,
        `${heading}\n\n${sections.map((s, i) => `Phần ${i + 1}\n${s.content}`).join("\n\n")}`,
        JSON.stringify(sections.flatMap((s) => s.citations)),
      ],
    );
  } catch (error) {
    await rows(
      "UPDATE notebook_ai.artifacts SET status=$2,error=$3,updated_at=now() WHERE id=$1 AND status<>'CANCELLED'",
      [
        id,
        controller.signal.aborted ? "CANCELLED" : "FAILED",
        "Chưa hoàn tất. Các phần đã xong được giữ lại; kiểm tra quota/model rồi thử lại.",
      ],
    );
    // Provider outcomes are not replayed automatically. A user can explicitly resume checkpoints.
    throw new UnrecoverableError(
      error instanceof Error ? error.name : "Summary failed",
    );
  } finally {
    clearInterval(timer);
    controller.abort();
  }
}

const worker = new Worker(
  "notebook-jobs",
  async (job) => {
    if (job.name === "index") return indexSource(job.data.sourceId);
    if (job.name === "summary") return summarize(job.data.artifactId);
    if (job.name === "cleanup") return rag("/delete", job.data);
    throw new UnrecoverableError("Unknown job");
  },
  { connection, prefix: "wh-notebook", concurrency: 2, autorun: false },
);
worker.on("error", () => console.error("Notebook queue connection failed"));
worker.on("failed", (job) =>
  console.error("Notebook job failed", { type: job?.name, id: job?.id }),
);
async function reconcile() {
  // Redis is durable, but recover jobs stranded between the SQL commit and queue write too.
  await rows(
    "UPDATE notebook_ai.requests SET status='FAILED' WHERE status='RUNNING' AND created_at<now()-interval '3 minutes'",
  );
  for (const source of await rows(
    "SELECT id FROM notebook_ai.sources WHERE status='QUEUED'",
  ))
    await enqueue("index", source.id, { sourceId: source.id });
  for (const artifact of await rows(
    "SELECT id FROM notebook_ai.artifacts WHERE status='QUEUED'",
  ))
    await enqueue("summary", artifact.id, { artifactId: artifact.id });
}
let reconciling = false;
const sweep = setInterval(() => {
  if (config.AI_ENABLED !== "true") return;
  if (reconciling) return;
  reconciling = true;
  void reconcile()
    .catch(() => console.error("Notebook queue recovery failed"))
    .finally(() => {
      reconciling = false;
    });
}, 30000);
if (config.AI_ENABLED === "true")
  void reconcile()
    .then(() => worker.run())
    .catch(() => {
      console.error("Notebook worker startup failed");
      process.exitCode = 1;
    });
else console.log("Notebook worker disabled");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    clearInterval(sweep);
    void worker.close().then(() => Promise.all([queue.close(), db.end()]));
  });
