import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
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
            AI_UI_MESSAGES.UPLOAD_DECLARED_SIZE,
          ),
        );
      else parts.push(chunk);
    };
    const onEnd = () =>
      finish(
        size === expectedSize
          ? undefined
          : new BadRequestException(AI_UI_MESSAGES.UPLOAD_SIZE_MISMATCH),
      );
    const onError = () =>
      finish(new BadRequestException(AI_UI_MESSAGES.UPLOAD_READ_FAILED));
    const onAbort = () => finish(new BadRequestException(AI_UI_MESSAGES.UPLOAD_ABORTED));
    const timer = setTimeout(
      () =>
        finish(new RequestTimeoutException(AI_UI_MESSAGES.UPLOAD_TIMEOUT)),
      timeoutMs,
    );
    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
    stream.once("aborted", onAbort);
  });
}
