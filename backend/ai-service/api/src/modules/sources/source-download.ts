import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Manifest } from "../../common/types";
import { checkFile, MAX_FILE_BYTES } from "./upload-rules";

export async function downloadSource(
  manifest: Pick<Manifest, "name" | "sizeBytes" | "downloadUrl">,
  signal?: AbortSignal,
): Promise<Buffer> {
  checkFile(manifest.name, manifest.sizeBytes);
  if (!manifest.downloadUrl)
    throw new ServiceUnavailableException(AI_UI_MESSAGES.SOURCE_URL_UNAVAILABLE);
  let response: Response;
  try {
    response = await fetch(manifest.downloadUrl, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
      redirect: "error",
    });
  } catch {
    throw new ServiceUnavailableException(
      AI_UI_MESSAGES.SOURCE_DOWNLOAD_FAILED,
    );
  }
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new ServiceUnavailableException(
      AI_UI_MESSAGES.SOURCE_DOWNLOAD_FAILED,
    );
  }
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_FILE_BYTES || size > manifest.sizeBytes)
        throw new PayloadTooLargeException(
          AI_UI_MESSAGES.SOURCE_FILE_MISMATCH,
        );
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (size !== manifest.sizeBytes)
    throw new BadRequestException(AI_UI_MESSAGES.SOURCE_SIZE_MISMATCH);

  return Buffer.concat(parts, size);
}
