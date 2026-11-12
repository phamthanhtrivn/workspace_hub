import { createHash } from "node:crypto";
import { createAbortGuard } from "../common/abort-guard";
import { singleFlight } from "../common/single-flight";
import { z } from "zod";
import { UnrecoverableError } from "bullmq";
import type { Actor, Source } from "../common/types";
import { config } from "../config/env.config";
import { mapVisionImages } from "../common/vision-concurrency";
import { rows, transaction } from "../infrastructure/database/database";
import { authorizeSources } from "../infrastructure/integrations/document.client";
import { rag } from "../infrastructure/integrations/rag.client";
import {
  describeImage,
  VISION_PROMPT_VERSION,
} from "../infrastructure/integrations/vision.client";

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const page = z.number().int().min(1).max(100).nullable();
const extractionSchema = z.object({
  pages: z
    .array(
      z.object({
        text: z.string().max(500000),
        page,
        imageId: digest.nullable().optional(),
      }),
    )
    .max(100),
  images: z
    .array(
      z.object({
        id: digest,
        hash: digest,
        page,
        context: z.string().max(6000),
        dataUrl: z
          .string()
          .max(1400000)
          .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/),
      }),
    )
    .max(24),
});
type Extraction = z.infer<typeof extractionSchema>;
const EXTRACTION_PIPELINE = "visual-v1";

function validateImages(extraction: Extraction) {
  for (const image of extraction.images) {
    if (hash(Buffer.from(image.dataUrl.split(",")[1], "base64")) !== image.hash)
      throw new UnrecoverableError("Ảnh trích xuất không khớp mã kiểm tra");
  }
}

async function extractOnce(
  source: Source,
  content: string,
  signal: AbortSignal,
): Promise<Extraction> {
  const [cached] = await rows<{
    payload: Omit<Extraction, "images"> & {
      images: Omit<Extraction["images"][number], "dataUrl">[];
    };
  }>(
    "SELECT payload FROM notebook_ai.source_extractions WHERE source_id=$1 AND revision=$2 AND pipeline=$3",
    [source.id, source.revision, EXTRACTION_PIPELINE],
  );
  if (cached) {
    const images = await rows<{ image_id: string; data_url: string }>(
      "SELECT image_id,data_url FROM notebook_ai.source_visuals WHERE source_id=$1 AND revision=$2",
      [source.id, source.revision],
    );
    const byId = new Map(
      images.map((image) => [image.image_id, image.data_url]),
    );
    const parsed = extractionSchema.safeParse({
      ...cached.payload,
      images: cached.payload.images.map((image) => ({
        ...image,
        dataUrl: byId.get(image.id),
      })),
    });
    if (parsed.success) {
      validateImages(parsed.data);

      return parsed.data;
    }
  }
  const extracted = extractionSchema.parse(
    await rag(
      "/extract",
      { scopeId: source.notebook_id, name: source.name, content },
      AbortSignal.any([signal, AbortSignal.timeout(210000)]),
    ),
  );
  validateImages(extracted);
  const payload = {
    ...extracted,
    images: extracted.images.map((image) => ({
      id: image.id,
      hash: image.hash,
      page: image.page,
      context: image.context,
    })),
  };
  await transaction(async (client) => {
    for (const image of extracted.images)
      await client.query(
        `INSERT INTO notebook_ai.source_visuals(source_id,revision,image_id,image_hash,page,data_url,context)
       VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(source_id,revision,image_id) DO UPDATE SET context=excluded.context`,
        [
          source.id,
          source.revision,
          image.id,
          image.hash,
          image.page,
          image.dataUrl,
          image.context,
        ],
      );
    await client.query(
      "INSERT INTO notebook_ai.source_extractions(source_id,revision,pipeline,payload) VALUES($1,$2,$3,$4) ON CONFLICT(source_id,revision,pipeline) DO UPDATE SET payload=excluded.payload",
      [
        source.id,
        source.revision,
        EXTRACTION_PIPELINE,
        JSON.stringify(payload),
      ],
    );
  });

  return extracted;
}

export async function enrichVisualSource(
  source: Source,
  actor: Actor,
  content: string,
) {
  const guard = createAbortGuard(15 * 60_000);
  const { signal } = guard;
  const authorize = singleFlight(async () => {
    signal.throwIfAborted();
    const [current] = await rows(
      "SELECT revision,status FROM notebook_ai.sources WHERE id=$1 AND notebook_id=$2",
      [source.id, source.notebook_id],
    );
    if (
      !current ||
      current.revision !== source.revision ||
      current.status !== "INDEXING"
    )
      throw new UnrecoverableError("Nguồn đã bị xóa hoặc thay đổi khi đọc ảnh");
    await authorizeSources(actor, [source]);
    signal.throwIfAborted();
  });
  guard.poll(3000, authorize);
  try {
    await authorize();
    const result = await extractOnce(source, content, signal);
    let completed = 0;
    const descriptions = new Map<string, Promise<string>>();
    const visuals = await mapVisionImages(
      result.images,
      config.VISION_CONCURRENCY ?? 3,
      async (image) => {
        await authorize();
        const contextHash = hash(image.context);
        const [cached] = await rows<{ description: string }>(
          `SELECT description FROM notebook_ai.source_visuals WHERE source_id=$1 AND revision=$2 AND image_hash=$3 AND context_hash=$4 AND model=$5 AND prompt_version=$6 LIMIT 1`,
          [
            source.id,
            source.revision,
            image.hash,
            contextHash,
            config.LLM_MODEL,
            VISION_PROMPT_VERSION,
          ],
        );
        let description = cached?.description;
        if (!description) {
          const key = `${image.hash}:${contextHash}`;
          let pending = descriptions.get(key);
          if (!pending) {
            pending = authorize().then(() =>
              describeImage(image.dataUrl, image.context, signal),
            );
            descriptions.set(key, pending);
          }
          description = await pending;
        }
        await authorize();
        await rows(
          `INSERT INTO notebook_ai.source_visuals(source_id,revision,image_id,image_hash,context_hash,model,prompt_version,page,data_url,description)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT(source_id,revision,image_id) DO UPDATE SET context_hash=excluded.context_hash,model=excluded.model,prompt_version=excluded.prompt_version,data_url=excluded.data_url,description=excluded.description`,
          [
            source.id,
            source.revision,
            image.id,
            image.hash,
            contextHash,
            config.LLM_MODEL,
            VISION_PROMPT_VERSION,
            image.page,
            image.dataUrl,
            description,
          ],
        );
        completed++;
        await rows(
          "UPDATE notebook_ai.sources SET progress=GREATEST(progress,$2),updated_at=now() WHERE id=$1 AND status='INDEXING'",
          [source.id, 40 + Math.floor((completed / result.images.length) * 40)],
        );

        return {
          text: `Nội dung đọc từ hình${image.page ? ` tại trang ${image.page}` : ""}:\n${description}`,
          page: image.page,
          imageId: image.id,
        };
      },
    );

    return { pages: result.pages, visuals };
  } finally {
    guard.stop();
  }
}
