import {
  ForbiddenException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { config } from "../../config/env.config";
import type { Actor, Manifest, Source } from "../../common/types";

export async function resolveDocuments(
  actor: Actor,
  refs: { documentId: string; versionId?: string }[],
  download = false,
): Promise<Manifest[]> {
  let response: Response;
  try {
    response = await fetch(
      `${config.DOCUMENT_SERVICE_URL}/internal/notebook-documents/resolve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-service-key": config.AI_DOCUMENT_SERVICE_KEY,
        },
        body: JSON.stringify({
          userId: actor.id,
          userEmail: actor.email,
          refs,
          download,
        }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
  } catch {
    throw new ServiceUnavailableException("Không xác minh được quyền tài liệu");
  }
  if (response.status === 403 || response.status === 404)
    throw new ForbiddenException("Nguồn đã bị xóa hoặc mất quyền truy cập");
  if (response.status === 401)
    throw new ServiceUnavailableException(
      "Khóa nội bộ giữa AI và Document Service chưa khớp cấu hình",
    );
  if (!response.ok)
    throw new ServiceUnavailableException("Document Service chưa sẵn sàng");
  const result = (await response.json()) as { data: Manifest[] };
  return result.data;
}

export async function authorizeSources(
  actor: Actor,
  sources: Source[],
  download = false,
) {
  if (!sources.length) return [];
  const manifests = await resolveDocuments(
    actor,
    sources.map((s) => ({
      documentId: s.document_id,
      versionId: s.version_id,
    })),
    download,
  );
  for (let i = 0; i < sources.length; i++) {
    const manifest = manifests[i];
    const source = sources[i];
    if (
      !manifest ||
      manifest.documentId !== source.document_id ||
      manifest.versionId !== source.version_id ||
      manifest.revision !== source.revision ||
      !manifest.current
    )
      throw new ForbiddenException(
        "Nguồn đã thay đổi. Hãy thêm phiên bản mới.",
      );
  }
  return manifests;
}

export async function resolveChatAttachment(
  ref: { userId: string; s3Key: string },
  download: boolean,
  signal: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch(
      `${config.DOCUMENT_SERVICE_URL}/internal/notebook-documents/resolve-chat-attachment`,
      {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "x-internal-service-key": config.AI_DOCUMENT_SERVICE_KEY,
        },
        body: JSON.stringify({ ...ref, download }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
      },
    );
  } catch {
    throw new ServiceUnavailableException(
      "Không xác minh được quyền tài liệu gốc.",
    );
  }
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 403 || response.status === 404)
      throw new ForbiddenException(
        "Tài liệu gốc đã bị xóa hoặc bạn chưa có quyền đọc.",
      );
    throw new ServiceUnavailableException(
      "Document Service chưa sẵn sàng xác minh file.",
    );
  }
  return (
    (await response.json()) as {
      data: {
        documentId: string;
        versionId: string;
        revision: string;
        sizeBytes: number;
        downloadUrl?: string;
      };
    }
  ).data;
}
