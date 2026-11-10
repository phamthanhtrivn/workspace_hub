"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibleSnapshot = visibleSnapshot;
exports.selectSources = selectSources;
exports.snapshotSources = snapshotSources;
exports.citeEvidence = citeEvidence;
exports.validateCitations = validateCitations;
exports.summaryGroups = summaryGroups;
function visibleSnapshot(snapshot, sources) {
    return snapshot.every((ref) => sources.some((source) => source.id === ref.id &&
        source.revision === ref.revision &&
        source.status === "READY"));
}
function selectSources(ids, sources) {
    if (!ids.length || ids.length > 5 || new Set(ids).size !== ids.length)
        throw new Error("Chọn từ 1 đến 5 nguồn");
    return ids.map((id) => {
        const source = sources.find((item) => item.id === id && item.status === "READY");
        if (!source)
            throw new Error("Nguồn chưa sẵn sàng hoặc không thuộc notebook");
        return source;
    });
}
function snapshotSources(snapshot, sources) {
    if (!visibleSnapshot(snapshot, sources))
        throw new Error("Nguồn đã thay đổi");
    return selectSources(snapshot.map((ref) => ref.id), sources);
}
function citeEvidence(evidence, sources) {
    return evidence.map((item, i) => {
        const source = sources.find((source) => source.id === item.sourceId);
        if (!source || item.text.length > 12000)
            throw new Error("Invalid retrieval scope");
        return {
            ...item,
            label: `S${i + 1}`,
            name: source.name,
            documentId: source.document_id,
            versionId: source.version_id,
        };
    });
}
function validateCitations(content, evidence) {
    const labels = [...content.matchAll(/\[\[(S\d+)\]\]/g)].map((match) => match[1]);
    if (!labels.length ||
        labels.some((label) => !evidence.some((item) => item.label === label)))
        throw new Error("AI trả lời thiếu trích dẫn hợp lệ. Hãy thử lại.");
    return evidence.filter((item) => labels.includes(item.label));
}
function summaryGroups(evidence) {
    const groups = [];
    let current = [];
    let bytes = 0;
    for (const item of evidence) {
        const size = Buffer.byteLength(item.text);
        if (current.length &&
            (bytes + size > 14000 || current[0].sourceId !== item.sourceId)) {
            groups.push(current);
            current = [];
            bytes = 0;
        }
        current.push(item);
        bytes += size;
    }
    if (current.length)
        groups.push(current);
    if (!groups.length || groups.length > 60)
        throw new Error("Nội dung vượt giới hạn tóm tắt; giảm số nguồn");
    return groups;
}
