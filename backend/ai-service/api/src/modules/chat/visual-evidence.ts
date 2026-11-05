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
  const ready = new Map(
    sources
      .filter((source) => source.status === "READY")
      .map((source) => [source.id, source]),
  );
  const candidates: {
    source_id: string;
    revision: string;
    image_id: string;
    label: string;
    position: number;
  }[] = [];
  const seen = new Set<string>();
  for (const item of evidence) {
    const source = ready.get(item.sourceId);
    if (!source || !item.imageId || !/^[a-f0-9]{64}$/.test(item.imageId))
      continue;
    const key = `${source.id}:${item.imageId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      source_id: source.id,
      revision: source.revision,
      image_id: item.imageId,
      label: item.label,
      position: candidates.length,
    });
  }
  if (!candidates.length) return [];
  const images = await rows<{ label: string; data_url: string }>(
    "SELECT requested.label,v.data_url FROM jsonb_to_recordset($1::jsonb) AS requested(source_id uuid,revision text,image_id text,label text,position int) JOIN notebook_ai.source_visuals v ON v.source_id=requested.source_id AND v.revision=requested.revision AND v.image_id=requested.image_id ORDER BY requested.position LIMIT 2",
    [JSON.stringify(candidates)],
  );
  return images.map((image) => ({
    label: image.label,
    dataUrl: image.data_url,
  }));
}
