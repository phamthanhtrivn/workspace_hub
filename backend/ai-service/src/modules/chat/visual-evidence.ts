import type { Citation, Source, VisualInput } from "../../common/types";
import { config } from "../../config/env.config";
import { rows } from "../../infrastructure/database/database";

export async function visualEvidence(
  question: string,
  evidence: Citation[],
  sources: Source[],
): Promise<VisualInput[]> {
  const plain = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d");
  if (
    config.VISUAL_ENABLED !== "true" ||
    !/\b(hinh|anh|bieu do|so do|cong thuc|bang|image|picture|figure|chart|diagram|graph|table)\b/.test(
      plain,
    )
  )
    return [];
  const result: VisualInput[] = [];
  const seen = new Set<string>();
  for (const item of evidence) {
    const source = sources.find(
      (source) => source.id === item.sourceId && source.status === "READY",
    );
    if (!source || !item.imageId || !/^[a-f0-9]{64}$/.test(item.imageId))
      continue;
    const key = `${source.id}:${item.imageId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [image] = await rows<{ data_url: string }>(
      "SELECT data_url FROM notebook_ai.source_visuals WHERE source_id=$1 AND revision=$2 AND image_id=$3",
      [source.id, source.revision, item.imageId],
    );
    if (image) result.push({ label: item.label, dataUrl: image.data_url });
    if (result.length === 2) break;
  }
  return result;
}
