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
    throw new ServiceUnavailableException("Không lấy được liên kết file gốc.");
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
      "Không tải được file gốc để kiểm tra. Hãy thử lại.",
    );
  }
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new ServiceUnavailableException(
      "Không tải được file gốc để kiểm tra. Hãy thử lại.",
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
          "File vượt 20 MiB hoặc kích thước phiên bản không khớp.",
        );
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (size !== manifest.sizeBytes)
    throw new BadRequestException("Kích thước phiên bản nguồn không khớp.");

  return Buffer.concat(parts, size);
}
