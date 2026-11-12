import { UnrecoverableError } from "bullmq";
import { randomUUID } from "node:crypto";
import { rows } from "../infrastructure/database/database";
import { authorizeSources } from "../infrastructure/integrations/document.client";
import { modelAnswer } from "../infrastructure/integrations/llm.client";
import { SourcesService } from "../modules/sources/sources.service";
import {
  citeEvidence,
  validateCitations,
  summaryGroups,
  snapshotSources,
} from "../common/evidence-policy";
import { createSourceAuthorization } from "../common/source-authorization";
import { rag } from "../infrastructure/integrations/rag.client";
import type {
  Actor,
  Citation,
  Evidence,
  Snapshot,
  Source,
} from "../common/types";
import { createAbortGuard, isCancellation } from "../common/abort-guard";
import { logError } from "../common/errors/error-log";
import { isProviderConnectTimeout } from "../infrastructure/integrations/provider-http";
import { notebookFailureMessage } from "../modules/chat/notebook-failure";
import {
  readSummarySections,
  synthesizeDocument,
  type SummarySection,
} from "./summary-synthesis";
const sourcesService = new SourcesService();
// The poller re-verifies source access at this cadence unless an inline check just did.
const SOURCE_RECHECK_MS = 3000;
export async function summarize(id: string) {
  const [artifact] = await rows(
    `SELECT a.*,n.owner_id FROM notebook_ai.artifacts a JOIN notebook_ai.notebooks n ON n.id=a.notebook_id WHERE a.id=$1`,
    [id],
  );
  if (!artifact || ["COMPLETED", "CANCELLED"].includes(artifact.status)) return;
  const runId = artifact.run_id || randomUUID();
  const claimed = await rows(
    "UPDATE notebook_ai.artifacts SET status='RUNNING',run_id=$2,updated_at=now() WHERE id=$1 AND status='QUEUED' AND (run_id=$2 OR run_id IS NULL) RETURNING *",
    [id, runId],
  );
  if (!claimed.length) return;
  Object.assign(artifact, claimed[0]);
  if (artifact.in_flight) {
    await rows(
      "UPDATE notebook_ai.artifacts SET status='FAILED',error='The previous provider request was interrupted and its outcome is unknown. Completed sections are saved. Select Resume summary to continue.' WHERE id=$1 AND run_id=$2 AND status='RUNNING'",
      [id, runId],
    );
    throw new UnrecoverableError("Previous provider outcome unknown");
  }
  const actor: Actor = { id: artifact.owner_id, email: artifact.owner_email };
  let sources: Source[];
  try {
    sources = snapshotSources(
      artifact.sources as Snapshot[],
      await sourcesService.sources(artifact.notebook_id),
    );
    await authorizeSources(actor, sources);
  } catch (error) {
    logError("notebook_summary_failed", error, {
      artifact_id: id,
      stage: "source_snapshot",
    });
    await rows(
      "UPDATE notebook_ai.artifacts SET status='FAILED',error=$2 WHERE id=$1 AND run_id=$3 AND status='RUNNING'",
      [id, notebookFailureMessage(error), runId],
    );
    throw new UnrecoverableError("Source snapshot unavailable");
  }
  const guard = createAbortGuard();
  const { controller } = guard;
  const authorization = createSourceAuthorization({
    actor,
    sources,
    snapshot: artifact.sources as Snapshot[],
    loadSources: () => sourcesService.sources(artifact.notebook_id),
    signal: controller.signal,
  });
  let lastAuthorized = Date.now();
  const authorize = async () => {
    await authorization();
    lastAuthorized = Date.now();
  };
  guard.poll(1000, async () => {
    try {
      const [state] = await rows(
        "SELECT status FROM notebook_ai.artifacts WHERE id=$1 AND run_id=$2 AND status='RUNNING'",
        [id, runId],
      );
      if (!state || state.status === "CANCELLED") {
        controller.abort();

        return;
      }
      if (Date.now() - lastAuthorized >= SOURCE_RECHECK_MS) await authorize();
    } catch (error) {
      logError("notebook_summary_source_check_failed", error, {
        artifact_id: id,
      });
      controller.abort(error);
    }
  });
  let stage = "fetch_chunks";
  // Checks source access before every provider call and waits out minute quotas.
  // `in_flight` marks a call whose outcome is unknown if the worker dies mid-request.
  const generate = async (
    question: string,
    evidence: Citation[],
    stages: { authorize: string; model: string },
    notes?: string[],
  ) => {
    let content = "";
    for await (const delta of modelAnswer(
      question,
      evidence,
      controller.signal,
      {
        purpose: "summary",
        notes,
        beforeCall: async () => {
          stage = stages.authorize;
          await authorize();
          controller.signal.throwIfAborted();
          const updated = await rows(
            "UPDATE notebook_ai.artifacts SET in_flight=true WHERE id=$1 AND status='RUNNING' AND run_id=$2 RETURNING id",
            [id, runId],
          );
          if (!updated.length) throw new Error("Summary is no longer running");
          stage = stages.model;
        },
      },
    )) {
      content += delta;
      if (content.length > 20000) throw new Error("Kết quả vượt giới hạn");
    }

    return content;
  };
  try {
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
    const ordered = sources.flatMap((source) =>
      evidence
        .filter((item) => item.sourceId === source.id)
        .sort((a, b) => a.position - b.position),
    );
    const all = citeEvidence(ordered, sources);
    // Overview explicitly samples excerpts; full summary visits every indexed chunk.
    const selected =
      artifact.kind === "OVERVIEW"
        ? sources.flatMap((s) =>
            all.filter((e) => e.sourceId === s.id).slice(0, 2),
          )
        : all;
    const groups = summaryGroups(selected);
    const needsSynthesis = sources.some(
      (source) =>
        groups.filter((group) => group[0].sourceId === source.id).length > 1,
    );
    const sections = readSummarySections(artifact.sections as SummarySection[]);
    if (sections.some((section) => !section.sourceId))
      throw new Error(
        "Bản nháp cũ cần được tạo lại theo định dạng tóm tắt mới.",
      );
    const originals = sections.filter((section) => !section.checkpointKey);
    for (let i = originals.length; i < groups.length; i++) {
      controller.signal.throwIfAborted();
      const question =
        artifact.kind === "OVERVIEW"
          ? "Viết tổng quan ngắn từ các đoạn trích, nói rõ đây không phải tóm tắt toàn văn; kết thúc bằng 3 câu hỏi gợi ý dựa trên nội dung."
          : "Tóm tắt file này bằng tiếng Việt, tối đa 250 từ, giúp người đọc nhanh chóng hiểu file nói về gì và cần nhớ gì. Mở đầu bằng 1–2 câu nêu chủ đề, mục đích và nội dung chính. Sau đó viết 'Điểm quan trọng:' và 3–5 gạch đầu dòng chọn lọc: yêu cầu hoặc việc cần làm, số liệu và thời hạn thiết yếu, điều kiện cần chú ý, quyết định hoặc kết luận chính, tùy nội dung thực tế. File ngắn có thể ít hơn 3 ý; không thêm ý để đủ số lượng. Không liệt kê mọi chi tiết, không ép nội dung vào mục không phù hợp, không suy diễn điều tài liệu không nói. Không trộn với file khác, không giải thích cách xử lý hay nhắc phạm vi hoặc số phần. Trích dẫn các thông tin từ tài liệu.";
      const content = await generate(question, groups[i], {
        authorize: "source_authorization",
        model: "model_response",
      });
      stage = "validate_citations";
      const citations = validateCitations(content, groups[i]);
      const section = { content, citations, sourceId: groups[i][0].sourceId };
      originals.push(section);
      sections.push(section);
      stage = "save_checkpoint";
      const saved = await rows(
        "UPDATE notebook_ai.artifacts SET sections=$2,progress=$3,in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING' AND run_id=$4 RETURNING id",
        [
          id,
          JSON.stringify(sections),
          Math.round(
            (originals.length * (needsSynthesis ? 90 : 100)) / groups.length,
          ),
          runId,
        ],
      );
      if (!saved.length)
        throw new DOMException("Summary superseded", "AbortError");
    }
    controller.signal.throwIfAborted();
    stage = "complete_summary";
    if (!originals.length || originals.length < groups.length)
      throw new Error("Chưa đọc đủ các phần");
    stage = "synthesize_summary";
    const summaries: SummarySection[] = [];
    for (const source of sources) {
      const original = originals.filter(
        (section) => section.sourceId === source.id,
      );
      summaries.push(
        await synthesizeDocument(
          source.id,
          original,
          sections,
          (question, evidence, notes) =>
            generate(
              question,
              evidence,
              {
                authorize: "synthesize_summary",
                model: "synthesize_summary",
              },
              notes,
            ),
          async () => {
            const saved = await rows(
              "UPDATE notebook_ai.artifacts SET sections=$2,progress=$3,in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING' AND run_id=$4 RETURNING id",
              [id, JSON.stringify(sections), 99, runId],
            );
            if (!saved.length)
              throw new DOMException("Summary superseded", "AbortError");
          },
        ),
      );
    }
    await authorize();
    controller.signal.throwIfAborted();
    const content = summaries
      .map(
        (section, index) =>
          `${sources.length > 1 ? `${sources[index].name}\n\n` : ""}${section.content}`,
      )
      .join("\n\n");
    await rows(
      `UPDATE notebook_ai.artifacts SET status='COMPLETED',progress=100,content=$2,citations=$3,updated_at=now()
      WHERE id=$1 AND status='RUNNING' AND run_id=$4`,
      [
        id,
        content,
        JSON.stringify(summaries.flatMap((s) => s.citations)),
        runId,
      ],
    );
  } catch (error) {
    const failure = controller.signal.aborted
      ? controller.signal.reason
      : error;
    const canceled = isCancellation(controller.signal);
    logError("notebook_summary_failed", failure, {
      artifact_id: id,
      stage,
      canceled,
      completed_sections: Array.isArray(artifact.sections)
        ? artifact.sections.length
        : 0,
    });
    const outputLimit =
      failure instanceof Error &&
      failure.message.startsWith("Câu trả lời bị cắt ở giới hạn ");
    await rows(
      "UPDATE notebook_ai.artifacts SET status=$2,error=$3,updated_at=now() WHERE id=$1 AND status='RUNNING' AND run_id=$4",
      [
        id,
        canceled ? "CANCELLED" : "FAILED",
        outputLimit
          ? "AI reached its output limit before completing this section. Completed sections are saved. Select Resume summary to continue."
          : isProviderConnectTimeout(failure)
            ? "Could not connect to the AI provider. Completed sections are saved. Select Resume summary to try again."
            : `${notebookFailureMessage(failure)} Completed sections are saved. Select Resume summary to try again.`,
        runId,
      ],
    );
    // Provider outcomes are not replayed automatically. A user can explicitly resume checkpoints.
    throw new UnrecoverableError(
      error instanceof Error ? error.name : "Summary failed",
    );
  } finally {
    guard.stop();
  }
}
