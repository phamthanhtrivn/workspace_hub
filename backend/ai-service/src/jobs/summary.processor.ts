import { UnrecoverableError } from "bullmq";
import { rows } from "../infrastructure/database/database";
import { authorizeSources } from "../infrastructure/integrations/document.client";
import { modelAnswer } from "../infrastructure/integrations/llm.client";
import { SourcesService } from "../modules/sources/sources.service";
import {
  citeEvidence,
  validateCitations,
  visibleSnapshot,
  summaryGroups,
  snapshotSources,
} from "../common/evidence-policy";
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
const sourcesService = new SourcesService();
type Section = { content: string; citations: Citation[]; sourceId: string };
export async function summarize(id: string) {
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
      await sourcesService.sources(artifact.notebook_id),
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
          await sourcesService.sources(artifact.notebook_id),
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
    const sections = artifact.sections as Section[];
    if (sections.some((section) => !section.sourceId))
      throw new Error(
        "Bản nháp cũ cần được tạo lại theo định dạng tóm tắt mới.",
      );
    for (let i = sections.length; i < groups.length; i++) {
      controller.signal.throwIfAborted();
      await authorizeSources(actor, sources);
      const question =
        artifact.kind === "OVERVIEW"
          ? "Viết tổng quan ngắn từ các đoạn trích, nói rõ đây không phải tóm tắt toàn văn; kết thúc bằng 3 câu hỏi gợi ý dựa trên nội dung."
          : "Tóm tắt file này bằng tiếng Việt, tối đa 250 từ, giúp người đọc nhanh chóng hiểu file nói về gì và cần nhớ gì. Mở đầu bằng 1–2 câu nêu chủ đề, mục đích và nội dung chính. Sau đó viết 'Điểm quan trọng:' và 3–5 gạch đầu dòng chọn lọc: yêu cầu hoặc việc cần làm, số liệu và thời hạn thiết yếu, điều kiện cần chú ý, quyết định hoặc kết luận chính, tùy nội dung thực tế. File ngắn có thể ít hơn 3 ý; không thêm ý để đủ số lượng. Không liệt kê mọi chi tiết, không ép nội dung vào mục không phù hợp, không suy diễn điều tài liệu không nói. Không trộn với file khác, không giải thích cách xử lý hay nhắc phạm vi hoặc số phần. Trích dẫn các thông tin từ tài liệu.";
      let content = "";
      while (true) {
        await rows(
          "UPDATE notebook_ai.artifacts SET in_flight=true WHERE id=$1 AND status='RUNNING'",
          [id],
        );
        try {
          for await (const delta of modelAnswer(
            question,
            groups[i],
            controller.signal,
            { purpose: "summary" },
          )) {
            content += delta;
            if (content.length > 20000)
              throw new Error("Kết quả vượt giới hạn");
          }
          break;
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
          controller.signal.throwIfAborted();
          await authorizeSources(actor, sources);
        }
      }
      const citations = validateCitations(content, groups[i]);
      sections.push({ content, citations, sourceId: groups[i][0].sourceId });
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
    const content = sources
      .map((source) => {
        const paragraphs = sections
          .filter((_section, index) => groups[index][0].sourceId === source.id)
          .map((section) => section.content);
        if (!paragraphs.length) return "";
        return `${sources.length > 1 ? `${source.name}\n\n` : ""}${paragraphs.join("\n\n")}`;
      })
      .filter(Boolean)
      .join("\n\n");
    await rows(
      `UPDATE notebook_ai.artifacts SET status='COMPLETED',progress=100,content=$2,citations=$3,updated_at=now()
      WHERE id=$1 AND status='RUNNING'`,
      [id, content, JSON.stringify(sections.flatMap((s) => s.citations))],
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
