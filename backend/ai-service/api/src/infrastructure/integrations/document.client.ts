import { AI_UI_MESSAGES } from "../../common/ai-ui.messages";
import {
  ForbiddenException,
  GoneException,
  PreconditionFailedException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { config } from "../../config/env.config";
import type { Actor, Manifest, Source } from "../../common/types";
import { internalPost, serviceUrl } from "./internal-http";

type DocumentMessages = {
  verify: string;
  forbidden: string;
  unavailable: string;
};

/** POSTs to the Document service and maps its failures to safe user-facing errors. */
async function documentRequest<T>(
  path: string,
  body: unknown,
  messages: DocumentMessages,
  signal?: AbortSignal,
  timeoutMs = 10000,
): Promise<T> {
  signal?.throwIfAborted();
  let response: Response;
  try {
    response = await internalPost(
      serviceUrl(config.DOCUMENT_SERVICE_URL, path),
      {
        key: config.AI_DOCUMENT_SERVICE_KEY,
        body,
        signal,
        timeoutMs,
      },
    );
  } catch {
    signal?.throwIfAborted();
    throw new ServiceUnavailableException(messages.verify);
  }
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 410)
      throw new GoneException(
        "The prepared copy has expired. Select the file again.",
      );
    if (response.status === 412)
      throw new PreconditionFailedException(AI_UI_MESSAGES.SOURCE_RESELECT);
    if (response.status === 403 || response.status === 404)
      throw new ForbiddenException(messages.forbidden);
    if (response.status === 401)
      throw new ServiceUnavailableException(
        AI_UI_MESSAGES.DOCUMENT_KEY_MISMATCH,
      );
    throw new ServiceUnavailableException(messages.unavailable);
  }
  const result = (await response.json()) as { data: T };
  signal?.throwIfAborted();

  return result.data;
}

export function resolveDocuments(
  actor: Actor,
  refs: { documentId: string; versionId?: string }[],
  download = false,
  signal?: AbortSignal,
): Promise<Manifest[]> {
  return documentRequest<Manifest[]>(
    "/internal/notebook-documents/resolve",
    { userId: actor.id, userEmail: actor.email, refs, download },
    {
      verify: AI_UI_MESSAGES.DOCUMENT_VERIFY_FAILED,
      forbidden: AI_UI_MESSAGES.DOCUMENT_FORBIDDEN,
      unavailable: AI_UI_MESSAGES.DOCUMENT_UNAVAILABLE,
    },
    signal,
  );
}

export async function authorizeSources(
  actor: Actor,
  sources: Source[],
  download = false,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (!sources.length) return [];
  const bySource = new Map<string, Manifest>();
  const legacy = sources.filter((source) => !source.snapshot_id);
  if (legacy.length) {
    const resolved = await resolveDocuments(
      actor,
      legacy.map((source) => ({
        documentId: source.document_id,
        versionId: source.version_id,
      })),
      download,
      signal,
    );
    legacy.forEach((source, index) => bySource.set(source.id, resolved[index]));
  }
  const notebooks = [
    ...new Set(
      sources
        .filter((source) => source.snapshot_id)
        .map((source) => source.notebook_id),
    ),
  ];
  await Promise.all(
    notebooks.map(async (notebookId) => {
      const copies = sources.filter(
        (source) => source.snapshot_id && source.notebook_id === notebookId,
      );
      const resolved = await notebookSnapshots<Manifest[]>(
        "resolve",
        {
          userId: actor.id,
          notebookId,
          ids: copies.map((source) => source.snapshot_id),
          download,
          retain: true,
        },
        signal,
      );
      copies.forEach((source, index) =>
        bySource.set(source.id, resolved[index]),
      );
    }),
  );
  const manifests = sources.map((source) => bySource.get(source.id)!);
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
      throw new ForbiddenException(AI_UI_MESSAGES.SOURCE_NEW_VERSION);
  }

  return manifests;
}

export function notebookSnapshots<T>(
  action: "copy" | "resolve" | "upload" | "confirm" | "remove",
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return documentRequest<T>(
    `/internal/notebook-snapshots/${action}`,
    body,
    {
      verify: "Notebook file storage is unavailable.",
      forbidden: "The selected file cannot be copied.",
      unavailable: "Unable to prepare the notebook copy.",
    },
    signal,
    action === "copy" ? 180000 : 10000,
  );
}

export function resolveChatAttachment(
  ref: { userId: string; s3Key: string },
  download: boolean,
  signal: AbortSignal,
) {
  return documentRequest<{
    documentId: string;
    versionId: string;
    revision: string;
    sizeBytes: number;
    downloadUrl?: string;
  }>(
    "/internal/notebook-documents/resolve-chat-attachment",
    { ...ref, download },
    {
      verify: AI_UI_MESSAGES.ORIGINAL_ACCESS_UNVERIFIED,
      forbidden: AI_UI_MESSAGES.ORIGINAL_FORBIDDEN,
      unavailable: AI_UI_MESSAGES.ORIGINAL_UNAVAILABLE,
    },
    signal,
  );
}

export async function documentPreviewUrl(
  documentId: string,
  authorization?: string,
): Promise<string> {
  if (!authorization) throw new ForbiddenException("Authentication required");
  let response: Response;
  try {
    response = await fetch(
      new URL(
        "/api/documents/" + encodeURIComponent(documentId) + "/preview",
        config.DOCUMENT_SERVICE_URL,
      ),
      {
        headers: { authorization },
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
  } catch {
    throw new ServiceUnavailableException("Document service unavailable");
  }
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 404
  )
    throw new ForbiddenException("Document access denied");
  if (!response.ok)
    throw new ServiceUnavailableException("Document service unavailable");

  return ((await response.json()) as { data: { url: string } }).data.url;
}
