import { UploadState } from "../types/documents.enums";
import type { DocumentUploadDestination } from "../types/upload.types";

const TRANSFER_MAX_PERCENT = 99;

/** The final percent is reserved for a successful server confirmation, without timed progress. */
export function uploadDisplayProgress(percent: number, state: UploadState): number {
  if (state === UploadState.SUCCESS) return 100;
  if (!Number.isFinite(percent)) return 0;
  return Math.max(0, Math.min(TRANSFER_MAX_PERCENT, Math.round(percent)));
}

export function isUploadPending(state: UploadState): boolean {
  return [UploadState.QUEUED, UploadState.AWAITING_OVERWRITE, UploadState.INITIATING,
    UploadState.UPLOADING, UploadState.CONFIRMING].includes(state);
}

export const UPLOAD_STATE_LABELS: Record<UploadState, string> = {
  [UploadState.IDLE]: "Waiting",
  [UploadState.QUEUED]: "Waiting",
  [UploadState.AWAITING_OVERWRITE]: "Waiting for overwrite confirmation",
  [UploadState.INITIATING]: "Preparing upload…",
  [UploadState.UPLOADING]: "Uploading…",
  [UploadState.CONFIRMING]: "Confirming upload…",
  [UploadState.SUCCESS]: "Upload complete",
  [UploadState.ERROR]: "Upload failed",
  [UploadState.PARTIAL]: "Some uploads failed",
  [UploadState.SKIPPED]: "Skipped",
};

export function uploadDestinationKey(destination: DocumentUploadDestination): string {
  return JSON.stringify([destination.folderId, destination.projectId,
    destination.version?.documentId, destination.version?.isPublic]);
}
