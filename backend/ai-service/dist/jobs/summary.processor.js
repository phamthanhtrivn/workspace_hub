"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarize = summarize;
const bullmq_1 = require("bullmq");
const database_1 = require("../infrastructure/database/database");
const document_client_1 = require("../infrastructure/integrations/document.client");
const llm_client_1 = require("../infrastructure/integrations/llm.client");
const sources_service_1 = require("../modules/sources/sources.service");
const evidence_policy_1 = require("../common/evidence-policy");
const rag_client_1 = require("../infrastructure/integrations/rag.client");
const promises_1 = require("node:timers/promises");
const model_quota_exception_1 = require("../common/errors/model-quota.exception");
const abort_polling_1 = require("../common/abort-polling");
const sourcesService = new sources_service_1.SourcesService();
async function summarize(id) {
    const [artifact] = await (0, database_1.rows)(`SELECT a.*,n.owner_id FROM notebook_ai.artifacts a JOIN notebook_ai.notebooks n ON n.id=a.notebook_id WHERE a.id=$1`, [id]);
    if (!artifact || ["COMPLETED", "CANCELLED"].includes(artifact.status))
        return;
    if (artifact.in_flight) {
        await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET status='FAILED',error='Worker bị gián đoạn khi gọi model. Chủ động tiếp tục để chạy lại phần chưa checkpoint.' WHERE id=$1", [id]);
        throw new bullmq_1.UnrecoverableError("Previous provider outcome unknown");
    }
    const actor = { id: artifact.owner_id, email: artifact.owner_email };
    let sources;
    try {
        sources = (0, evidence_policy_1.snapshotSources)(artifact.sources, await sourcesService.sources(artifact.notebook_id));
        await (0, document_client_1.authorizeSources)(actor, sources);
    }
    catch {
        await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET status='FAILED',error='Không xác minh được snapshot nguồn. Kiểm tra quyền và phiên bản trước khi tiếp tục.' WHERE id=$1", [id]);
        throw new bullmq_1.UnrecoverableError("Source snapshot unavailable");
    }
    const controller = new AbortController();
    const stopPolling = (0, abort_polling_1.pollUntilAborted)(controller, 1000, async () => {
        const [state] = await (0, database_1.rows)("SELECT status FROM notebook_ai.artifacts WHERE id=$1", [id]);
        if (!state || state.status === "CANCELLED")
            controller.abort();
        if (!(0, evidence_policy_1.visibleSnapshot)(artifact.sources, await sourcesService.sources(artifact.notebook_id)))
            controller.abort();
        await (0, document_client_1.authorizeSources)(actor, sources);
    });
    try {
        await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET status='RUNNING',error=NULL,updated_at=now() WHERE id=$1 AND status<>'CANCELLED'", [id]);
        const { evidence } = await (0, rag_client_1.rag)("/chunks", { scopeId: artifact.notebook_id, sourceIds: sources.map((s) => s.id) }, AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]));
        if (sources.some((s) => evidence.filter((e) => e.sourceId === s.id).length !== s.chunk_count))
            throw new Error("Chỉ mục thiếu phần; cần lập lại chỉ mục");
        const ordered = sources.flatMap((source) => evidence
            .filter((item) => item.sourceId === source.id)
            .sort((a, b) => a.position - b.position));
        const all = (0, evidence_policy_1.citeEvidence)(ordered, sources);
        // Overview explicitly samples excerpts; full summary visits every indexed chunk.
        const selected = artifact.kind === "OVERVIEW"
            ? sources.flatMap((s) => all.filter((e) => e.sourceId === s.id).slice(0, 2))
            : all;
        const groups = (0, evidence_policy_1.summaryGroups)(selected);
        const sections = artifact.sections;
        if (sections.some((section) => !section.sourceId))
            throw new Error("Bản nháp cũ cần được tạo lại theo định dạng tóm tắt mới.");
        for (let i = sections.length; i < groups.length; i++) {
            controller.signal.throwIfAborted();
            await (0, document_client_1.authorizeSources)(actor, sources);
            const question = artifact.kind === "OVERVIEW"
                ? "Viết tổng quan ngắn từ các đoạn trích, nói rõ đây không phải tóm tắt toàn văn; kết thúc bằng 3 câu hỏi gợi ý dựa trên nội dung."
                : "Tóm tắt file này bằng tiếng Việt, tối đa 250 từ, giúp người đọc nhanh chóng hiểu file nói về gì và cần nhớ gì. Mở đầu bằng 1–2 câu nêu chủ đề, mục đích và nội dung chính. Sau đó viết 'Điểm quan trọng:' và 3–5 gạch đầu dòng chọn lọc: yêu cầu hoặc việc cần làm, số liệu và thời hạn thiết yếu, điều kiện cần chú ý, quyết định hoặc kết luận chính, tùy nội dung thực tế. File ngắn có thể ít hơn 3 ý; không thêm ý để đủ số lượng. Không liệt kê mọi chi tiết, không ép nội dung vào mục không phù hợp, không suy diễn điều tài liệu không nói. Không trộn với file khác, không giải thích cách xử lý hay nhắc phạm vi hoặc số phần. Trích dẫn các thông tin từ tài liệu.";
            let content = "";
            while (true) {
                await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET in_flight=true WHERE id=$1 AND status='RUNNING'", [id]);
                try {
                    for await (const delta of (0, llm_client_1.modelAnswer)(question, groups[i], controller.signal, { purpose: "summary" })) {
                        content += delta;
                        if (content.length > 20000)
                            throw new Error("Kết quả vượt giới hạn");
                    }
                    break;
                }
                catch (error) {
                    if (!(error instanceof model_quota_exception_1.ModelMinuteQuotaException) || content.length)
                        throw error;
                    await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING'", [id]);
                    await (0, promises_1.setTimeout)(error.retryAfterMs + Math.random() * 250, undefined, {
                        signal: controller.signal,
                    });
                    controller.signal.throwIfAborted();
                    await (0, document_client_1.authorizeSources)(actor, sources);
                }
            }
            const citations = (0, evidence_policy_1.validateCitations)(content, groups[i]);
            sections.push({ content, citations, sourceId: groups[i][0].sourceId });
            await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET sections=$2,progress=$3,in_flight=false,updated_at=now() WHERE id=$1 AND status='RUNNING'", [
                id,
                JSON.stringify(sections),
                Math.round((sections.length * 100) / groups.length),
            ]);
        }
        controller.signal.throwIfAborted();
        await (0, document_client_1.authorizeSources)(actor, sources);
        if (!sections.length || sections.length !== groups.length)
            throw new Error("Chưa đọc đủ các phần");
        const content = sources
            .map((source) => {
            const paragraphs = sections
                .filter((_section, index) => groups[index][0].sourceId === source.id)
                .map((section) => section.content);
            if (!paragraphs.length)
                return "";
            return `${sources.length > 1 ? `${source.name}\n\n` : ""}${paragraphs.join("\n\n")}`;
        })
            .filter(Boolean)
            .join("\n\n");
        await (0, database_1.rows)(`UPDATE notebook_ai.artifacts SET status='COMPLETED',progress=100,content=$2,citations=$3,updated_at=now()
      WHERE id=$1 AND status='RUNNING'`, [id, content, JSON.stringify(sections.flatMap((s) => s.citations))]);
    }
    catch (error) {
        await (0, database_1.rows)("UPDATE notebook_ai.artifacts SET status=$2,error=$3,updated_at=now() WHERE id=$1 AND status<>'CANCELLED'", [
            id,
            controller.signal.aborted ? "CANCELLED" : "FAILED",
            "Chưa hoàn tất. Các phần đã xong được giữ lại; kiểm tra quota/model rồi thử lại.",
        ]);
        // Provider outcomes are not replayed automatically. A user can explicitly resume checkpoints.
        throw new bullmq_1.UnrecoverableError(error instanceof Error ? error.name : "Summary failed");
    }
    finally {
        stopPolling();
        controller.abort();
    }
}
