import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { config } from "../../config/env.config";
import type { Evidence } from "../../common/types";
import { internalPost, serviceUrl } from "./internal-http";
export async function rag<T>(
  path: string,
  body: unknown,
  signal = AbortSignal.timeout(20000),
): Promise<T> {
  let response: Response;
  try {
    response = await internalPost(serviceUrl(config.RAG_WORKER_URL, path), {
      key: config.RAG_SERVICE_KEY,
      body,
      signal,
    });
  } catch {
    throw new ServiceUnavailableException(
      AI_UI_MESSAGES.RAG_UNAVAILABLE,
    );
  }
  if (response.status === 422) {
    const messages: Record<string, string> = {
      PDF_PAGE_LIMIT:
        AI_UI_MESSAGES.PDF_PAGE_LIMIT,
      PDF_ENCRYPTED:
        AI_UI_MESSAGES.PDF_ENCRYPTED,
      PDF_OCR_REQUIRED:
        AI_UI_MESSAGES.PDF_OCR_REQUIRED,
      SOURCE_TOKEN_LIMIT:
        "This file exceeds 100,000 tokens. Split it into smaller files and upload them again.",
      DOCX_EXPANDED_LIMIT:
        AI_UI_MESSAGES.DOCX_EXPANDED_LIMIT,
      VISUAL_PAGE_LIMIT:
        AI_UI_MESSAGES.VISUAL_PAGE_LIMIT,
      IMAGE_DIMENSION_LIMIT:
        AI_UI_MESSAGES.IMAGE_DIMENSIONS,
      IMAGE_FORMAT_INVALID:
        AI_UI_MESSAGES.IMAGE_INVALID,
      IMAGE_ANIMATED: AI_UI_MESSAGES.IMAGE_ANIMATED,
      OCR_PROCESSING_LIMIT:
        AI_UI_MESSAGES.OCR_TIMEOUT,
      VISUAL_DISABLED: AI_UI_MESSAGES.VISUAL_DISABLED,
    };
    const body = (await response.json().catch(() => null)) as {
      detail?: { code?: string };
    } | null;
    const code = body?.detail?.code || "";
    throw new BadRequestException(
      Object.hasOwn(messages, code)
        ? messages[code]
        : AI_UI_MESSAGES.FILE_INVALID,
    );
  }
  if (!response.ok) {
    let code = "RAG_DEPENDENCY_FAILED";
    try {
      const body = (await response.json()) as { detail?: { code?: string } };
      if (body.detail?.code === "RAG_BUSY") code = "RAG_BUSY";
      if (body.detail?.code === "RAG_FALLBACK_PENDING")
        code = "RAG_FALLBACK_PENDING";
      if (body.detail?.code === "RAG_MEMORY_PRESSURE")
        code = "RAG_MEMORY_PRESSURE";
    } catch {
      /* Never surface arbitrary upstream bodies. */
    }
    if (code === "RAG_FALLBACK_PENDING")
      throw new ServiceUnavailableException(
        AI_UI_MESSAGES.RAG_FALLBACK_PENDING,
      );
    if (code === "RAG_BUSY")
      throw new ServiceUnavailableException(
        AI_UI_MESSAGES.RAG_BUSY,
      );
    throw new ServiceUnavailableException(
      AI_UI_MESSAGES.RAG_DEPENDENCY_FAILED(code, response.status),
    );
  }

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
