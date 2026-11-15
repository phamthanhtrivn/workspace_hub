import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { config } from "../../config/env.config";
import type { Manifest, Source } from "../../common/types";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_NOTEBOOK_BYTES = 50 * 1024 * 1024;

export function checkFile(name: string, size: number) {
  const supported =
    config.VISUAL_ENABLED === "true"
      ? /\.(pdf|docx|txt|md|png|jpe?g|webp)$/i
      : /\.(pdf|docx|txt|md)$/i;
  if (!name || name.length > 300 || !supported.test(name))
    throw new BadRequestException(
      AI_UI_MESSAGES.UPLOAD_TYPE,
    );
  if (!Number.isSafeInteger(size) || size <= 0)
    throw new BadRequestException(AI_UI_MESSAGES.UPLOAD_EMPTY);
  if (size > MAX_FILE_BYTES)
    throw new PayloadTooLargeException(
      AI_UI_MESSAGES.UPLOAD_FILE_LIMIT,
    );
}

export function checkCapacity(
  existing: Source[],
  count: number,
  bytes: number,
) {
  if (!Number.isSafeInteger(count) || count < 1 || existing.length + count > 5)
    throw new BadRequestException(
      AI_UI_MESSAGES.UPLOAD_SOURCE_LIMIT,
    );
  if (
    !Number.isSafeInteger(bytes) ||
    bytes < 1 ||
    existing.reduce((sum, s) => sum + Number(s.size_bytes), 0) + bytes >
      MAX_NOTEBOOK_BYTES
  )
    throw new PayloadTooLargeException(
      AI_UI_MESSAGES.UPLOAD_TOTAL_LIMIT,
    );
}

export function checkManifests(existing: Source[], manifests: Manifest[]) {
  for (const m of manifests) {
    checkFile(m.name, m.sizeBytes);
    if (!m.current)
      throw new BadRequestException(AI_UI_MESSAGES.CURRENT_VERSION_REQUIRED);
    if (
      existing.some(
        (source) =>
          source.document_id === m.documentId &&
          source.version_id === m.versionId &&
          source.revision !== m.revision,
      )
    )
      throw new BadRequestException(
        AI_UI_MESSAGES.SOURCE_RESELECT,
      );
  }
  const unique = [
    ...new Map(
      manifests.map((m) => [`${m.documentId}:${m.versionId}`, m]),
    ).values(),
  ];
  const fresh = unique.filter(
    (m) =>
      !existing.some(
        (s) => s.document_id === m.documentId && s.version_id === m.versionId,
      ),
  );
  if (fresh.length)
    checkCapacity(
      existing,
      fresh.length,
      fresh.reduce((sum, m) => sum + m.sizeBytes, 0),
    );

  return fresh;
}
