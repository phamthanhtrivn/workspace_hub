import { UnrecoverableError } from "bullmq";
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
import { setTimeout as pause } from "node:timers/promises";
import { ModelMinuteQuotaException } from "../common/errors/model-quota.exception";
import { createAbortGuard } from "../common/abort-guard";
import { logError } from "../common/errors/error-log";
import { isProviderConnectTimeout } from "../infrastructure/integrations/provider-http";
import { notebookFailureMessage } from "../modules/chat/notebook-failure";
import { synthesizeDocument } from "./summary-synthesis";
const sourcesService = new SourcesService();
type Section = { content: string; citations: Citation[]; sourceId: string };
// The poller re-verifies source access at this cadence unless an inline check just did.
const SOURCE_RECHECK_MS = 3000;
export async function summarize(id: string) {
  const [artifact] = await rows(
    `SELECT a.*,n.owner_id FROM notebook_ai.artifacts a JOIN notebook_ai.notebooks n ON n.id=a.notebook_id WHERE a.id=$1`,
    [id],
  );
  if (!artifact || ["COMPLETED", "CANCELLED"].includes(artifact.status)) return;
  if (artifact.in_flight) {
    await rows(
      "UPDATE notebook_ai.artifacts SET status='FAILED',error='The previous provider request was interrupted and its outcome is unknown. Completed sections are saved. Select Resume summary to continue.' WHERE id=$1",
      [id],
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
      "UPDATE notebook_ai.artifacts SET status='FAILED',error=$2 WHERE id=$1",
      [id, notebookFailureMessage(error)],
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
        "SELECT status FROM notebook_ai.artifacts WHERE id=$1",
        [id],
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
    while (true) {
      stage = stages.authorize;
      await authorize();
      controller.signal.throwIfAborted();
      await rows(
        "UPDATE notebook_ai.artifacts SET in_flight=true WHERE id=$1 AND status='RUNNING'",
        [id],
      );
      stage = stages.model;
      let content = "";
      try {
        for await (const delta of modelAnswer(
          question,
          evidence,
          controller.signal,
          { purpose: "summary", notes },
        )) {
          content += delta;
          if (content.length > 20000) throw new Error("Kết quả vượt giới hạn");
        }

        return content;
      } catch (error) {
        if (!(error instanceof ModelMinuteQuotaException) || content.length)
          throw error;
        await rows(
          "UPDATE notebook_ai.artifacts SET in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING'",
          [id],
        );
        await pause(error.retryAfterMs + Math.random() * 250, undefined, {
          signal: controller.signal,
        });
      }
    }
  };
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
    const sections = artifact.sections as Section[];
    if (sections.some((section) => !section.sourceId))
      throw new Error(
        "Bản nháp cũ cần được tạo lại theo định dạng tóm tắt mới.",
      );
    for (let i = sections.length; i < groups.length; i++) {
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
      sections.push({ content, citations, sourceId: groups[i][0].sourceId });
      stage = "save_checkpoint";
      await rows(
        "UPDATE notebook_ai.artifacts SET sections=$2,progress=$3,in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING'",
        [
          id,
          JSON.stringify(sections),
          Math.round(
            (sections.length * (needsSynthesis ? 90 : 100)) / groups.length,
          ),
        ],
      );
    }
    controller.signal.throwIfAborted();
    stage = "complete_summary";
    if (!sections.length || sections.length < groups.length)
      throw new Error("Chưa đọc đủ các phần");
    stage = "synthesize_summary";
    const summaries: Section[] = [];
    for (const source of sources) {
      const original = sections
        .slice(0, groups.length)
        .filter((section) => section.sourceId === source.id);
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
            await rows(
              "UPDATE notebook_ai.artifacts SET sections=$2,progress=$3,in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING'",
              [id, JSON.stringify(sections), 99],
            );
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
      WHERE id=$1 AND status='RUNNING'`,
      [id, content, JSON.stringify(summaries.flatMap((s) => s.citations))],
    );
  } catch (error) {
    const failure = controller.signal.aborted
      ? controller.signal.reason
      : error;
    const canceled =
      controller.signal.aborted &&
      failure instanceof Error &&
      failure.name === "AbortError";
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
      "UPDATE notebook_ai.artifacts SET status=$2,error=$3,updated_at=now() WHERE id=$1 AND status<>'CANCELLED'",
      [
        id,
        canceled ? "CANCELLED" : "FAILED",
        outputLimit
          ? "AI reached its output limit before completing this section. Completed sections are saved. Select Resume summary to continue."
          : isProviderConnectTimeout(failure)
            ? "Could not connect to the AI provider. Completed sections are saved. Select Resume summary to try again."
            : `${notebookFailureMessage(failure)} Completed sections are saved. Select Resume summary to try again.`,
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
