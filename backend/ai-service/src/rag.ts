import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { config } from "./config";
import type { Evidence } from "./types";
export async function rag<T>(
  path: string,
  body: unknown,
  signal = AbortSignal.timeout(20000),
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.RAG_WORKER_URL}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-service-key": config.RAG_SERVICE_KEY,
      },
      body: JSON.stringify(body),
      signal,
      redirect: "error",
    });
  } catch {
    throw new ServiceUnavailableException(
      "RAG worker chưa sẵn sàng hoặc đã hết thời gian chờ",
    );
  }
  if (response.status === 422)
    throw new BadRequestException(
      "File không hợp lệ, PDF scan/mã hóa hoặc vượt 100 trang/40.000 token. Tách file nhỏ hơn; OCR chưa được bật.",
    );
  if (!response.ok)
    throw new ServiceUnavailableException(
      `Xử lý tài liệu thất bại (HTTP ${response.status})`,
    );
  return (await response.json()) as T;
}
export function retrieve(
  scopeId: string,
  sourceIds: string[],
  question: string,
  signal: AbortSignal,
) {
  return rag<{ evidence: Evidence[] }>(
    "/retrieve",
    { scopeId, sourceIds, question },
    AbortSignal.any([signal, AbortSignal.timeout(20000)]),
  );
}
