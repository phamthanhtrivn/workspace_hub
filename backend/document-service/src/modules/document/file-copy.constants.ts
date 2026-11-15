import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';

export const FILE_COPY = {
  CHAT_BYTES: 10 * 1024 * 1024,
  NOTEBOOK_BYTES: 20 * 1024 * 1024,
  LEASE_MS: 180_000,
  EXPORT_TTL_MS: 24 * 60 * 60 * 1000,
  ZIP_INPUT_BYTES: 100 * 1024 * 1024,
  ZIP_FILES: 1000,
  SOURCE_CHECK_BATCH: 10,
  URL_SECONDS: 120,
} as const;
export const FILE_COPY_MESSAGES = {
  changed: 'The source changed. Select it again to copy the current version.',
  preparing: 'This copy is still being prepared. Retry the same operation.',
  unavailable: 'The selected file is unavailable or cannot be downloaded.',
  folders: 'Folders can only be sent to chat as ZIP attachments.',
  tooLarge: 'The attachment exceeds 10 MiB. Select fewer files.',
} as const;

export type ModuleSnapshotScope = 'CHAT' | 'NOTEBOOK';

/** Private metadata stays separate while storage uses the existing Documents IAM namespace. */
export const moduleSnapshotKey = (
  actorId: string,
  scope: ModuleSnapshotScope,
  id: string,
) =>
  `${DOCUMENT_CONSTANTS.S3_FOLDER}/${actorId}/module-snapshots/${scope.toLowerCase()}/${id}`;
