import {
  BadRequestException,
  PayloadTooLargeException,
  RequestTimeoutException,
} from "@nestjs/common";
import type { Readable } from "node:stream";
import { MAX_FILE_BYTES } from "./upload-rules";

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
