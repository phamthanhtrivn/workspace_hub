import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
  RequestTimeoutException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Readable } from "node:stream";
import { rag } from "../../infrastructure/integrations/rag.client";
import type { Manifest, Source } from "../../common/types";
import { profiled } from "../../common/profiling/pipeline-profiler";
import { config } from "../../config/env.config";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_NOTEBOOK_BYTES = 50 * 1024 * 1024;

export function checkFile(name: string, size: number) {
  const supported =
    config.VISUAL_ENABLED === "true"
      ? /\.(pdf|docx|txt|md|png|jpe?g|webp)$/i
      : /\.(pdf|docx|txt|md)$/i;
  if (!name || name.length > 300 || !supported.test(name))
    throw new BadRequestException(
      "Chỉ nhận PDF, DOCX, TXT, MD hoặc ảnh PNG/JPEG/WebP khi bật đọc ảnh (tên tối đa 300 ký tự).",
    );
  if (!Number.isSafeInteger(size) || size <= 0)
    throw new BadRequestException("File rỗng hoặc kích thước không hợp lệ.");
  if (size > MAX_FILE_BYTES)
    throw new PayloadTooLargeException(
      "File vượt 20 MiB. Hãy tách thành file nhỏ hơn.",
    );
}

export function checkCapacity(
  existing: Source[],
  count: number,
  bytes: number,
) {
  if (!Number.isSafeInteger(count) || count < 1 || existing.length + count > 5)
    throw new BadRequestException(
      "Notebook tối đa 5 file. Hãy bỏ bớt nguồn trước khi tải lên.",
    );
  if (
    !Number.isSafeInteger(bytes) ||
    bytes < 1 ||
    existing.reduce((sum, s) => sum + Number(s.size_bytes), 0) + bytes >
      MAX_NOTEBOOK_BYTES
  )
    throw new PayloadTooLargeException(
      "Tổng dung lượng notebook vượt 50 MiB. Hãy giảm số lượng hoặc dung lượng file.",
    );
}

export function checkManifests(existing: Source[], manifests: Manifest[]) {
  for (const m of manifests) {
    checkFile(m.name, m.sizeBytes);
    if (!m.current)
      throw new BadRequestException("Chỉ nhận phiên bản tài liệu hiện tại.");
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

// Do not buffer concurrent 20 MiB uploads or let validation build an unbounded backlog.
let checking = false;
export async function withUploadCheck<T>(run: () => Promise<T>): Promise<T> {
  if (checking)
    throw new HttpException(
      "Đang kiểm tra file khác. Vui lòng thử lại sau ít giây.",
      429,
    );
  checking = true;
  try {
    return await run();
  } finally {
    checking = false;
  }
}

export function readUpload(
  stream: Readable,
  expectedSize: number,
  timeoutMs = 30000,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    let size = 0;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      stream.pause();
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onError);
      stream.off("aborted", onAbort);
      if (error) reject(error);
      else resolve(Buffer.concat(parts, size));
    };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_FILE_BYTES || size > expectedSize)
        finish(
          new PayloadTooLargeException(
            "File vượt kích thước khai báo hoặc 20 MiB.",
          ),
        );
      else parts.push(chunk);
    };
    const onEnd = () =>
      finish(
        size === expectedSize
          ? undefined
          : new BadRequestException("Kích thước file không khớp."),
      );
    const onError = () =>
      finish(new BadRequestException("Không đọc được file tải lên."));
    const onAbort = () => finish(new BadRequestException("Đã ngắt tải file."));
    const timer = setTimeout(
      () =>
        finish(new RequestTimeoutException("Tải file quá thời gian cho phép.")),
      timeoutMs,
    );
    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
    stream.once("aborted", onAbort);
  });
}

export async function validateContent(
  name: string,
  data: Buffer,
  scopeId: string,
) {
  checkFile(name, data.length);
  return profiled("preflight", async (timing) => {
    const content = await timing.measure("encode_ms", () =>
      data.toString("base64"),
    );
    return timing.measure("rag_ms", () =>
      rag<{ chunkCount: number }>(
        "/validate",
        {
          scopeId,
          name,
          content,
        },
        AbortSignal.timeout(45000),
      ),
    );
  });
}

export async function downloadSource(manifest: Manifest): Promise<Buffer> {
  checkFile(manifest.name, manifest.sizeBytes);
  if (!manifest.downloadUrl)
    throw new ServiceUnavailableException("Không lấy được liên kết file gốc.");
  let response: Response;
  try {
    response = await fetch(manifest.downloadUrl, {
      signal: AbortSignal.timeout(30000),
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
