import type { Citation, Evidence, Snapshot, Source } from "./types";

export function visibleSnapshot(snapshot: Snapshot[], sources: Source[]) {
  return snapshot.every((ref) =>
    sources.some(
      (source) =>
        source.id === ref.id &&
        source.revision === ref.revision &&
        source.status === "READY",
    ),
  );
}

export function selectSources(ids: string[], sources: Source[]) {
  if (!ids.length || ids.length > 5 || new Set(ids).size !== ids.length)
    throw new Error("Chọn từ 1 đến 5 nguồn");

  return ids.map((id) => {
    const source = sources.find(
      (item) => item.id === id && item.status === "READY",
    );
    if (!source)
      throw new Error("Nguồn chưa sẵn sàng hoặc không thuộc notebook");

    return source;
  });
}

export function citeEvidence(
  evidence: Evidence[],
  sources: Source[],
): Citation[] {
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

export function validateCitations(content: string, evidence: Citation[]) {
  const labels = [...content.matchAll(/\[\[(S\d+)\]\]/g)].map(
    (match) => match[1],
  );
  if (
    !labels.length ||
    labels.some((label) => !evidence.some((item) => item.label === label))
  )
    throw new Error("AI trả lời thiếu trích dẫn hợp lệ. Hãy thử lại.");

  return evidence.filter((item) => labels.includes(item.label));
}
