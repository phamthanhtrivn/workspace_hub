import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { config } from "../../config/env.config";
import type { Evidence } from "../../common/types";
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
  if (response.status === 422) {
    const messages: Record<string, string> = {
      PDF_PAGE_LIMIT:
        "PDF vượt 100 trang. Hãy tách thành file nhỏ hơn trước khi tải lên.",
      PDF_ENCRYPTED:
        "PDF được mã hóa hoặc có mật khẩu. Hãy dùng bản không mã hóa.",
      PDF_OCR_REQUIRED:
        "PDF có trang scan chưa có lớp văn bản. Hãy OCR file trước khi tải lên.",
      SOURCE_TOKEN_LIMIT:
        "Nội dung vượt 40.000 token/file. Hãy tách tài liệu thành file nhỏ hơn.",
      DOCX_EXPANDED_LIMIT:
        "Nội dung DOCX sau giải nén vượt 100 MiB. Hãy giảm ảnh hoặc tách file.",
      VISUAL_PAGE_LIMIT:
        "File vượt 24 trang/hình cần Vision hoặc 16 MiB ảnh trích xuất. Hãy tách tài liệu nhỏ hơn.",
      IMAGE_DIMENSION_LIMIT:
        "Ảnh vượt 20 triệu điểm ảnh, quá nhỏ hoặc ảnh trích xuất quá lớn. Hãy giảm kích thước hoặc tách trang.",
      IMAGE_FORMAT_INVALID:
        "Ảnh hỏng hoặc định dạng không khớp. Hãy dùng PNG, JPEG hoặc WebP hợp lệ.",
      IMAGE_ANIMATED: "Chưa hỗ trợ ảnh động. Hãy dùng một ảnh tĩnh.",
      OCR_PROCESSING_LIMIT:
        "OCR vượt thời gian xử lý. Hãy tách tài liệu ít trang hơn.",
      VISUAL_DISABLED: "Chức năng đọc ảnh chưa bật trên máy chủ.",
    };
    const body = (await response.json().catch(() => null)) as {
      detail?: { code?: string };
    } | null;
    const code = body?.detail?.code || "";
    throw new BadRequestException(
      Object.hasOwn(messages, code)
        ? messages[code]
        : "File hỏng, rỗng hoặc không đọc được nội dung. Hãy kiểm tra định dạng tài liệu hoặc ảnh.",
    );
  }
  if (!response.ok) {
    let code = "RAG_DEPENDENCY_FAILED";
    try {
      const body = (await response.json()) as { detail?: { code?: string } };
      if (body.detail?.code === "RAG_BUSY") code = "RAG_BUSY";
      if (body.detail?.code === "RAG_MEMORY_PRESSURE")
        code = "RAG_MEMORY_PRESSURE";
    } catch {
      /* Never surface arbitrary upstream bodies. */
    }
    if (code === "RAG_BUSY")
      throw new ServiceUnavailableException(
        "RAG đang xử lý file khác. Chưa thêm nguồn AI; vui lòng thử lại sau ít giây.",
      );
    throw new ServiceUnavailableException(
      `${code}: RAG worker chưa xử lý được tài liệu (HTTP ${response.status}). Kiểm tra model, Qdrant và bộ nhớ.`,
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
