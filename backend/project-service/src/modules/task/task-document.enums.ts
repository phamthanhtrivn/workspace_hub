export const TaskDocumentAttachmentSource = {
  DEVICE_UPLOAD: 'DEVICE_UPLOAD',
  MY_FILES: 'MY_FILES',
  PROJECT_DOCUMENT: 'PROJECT_DOCUMENT',
} as const;

export type TaskDocumentAttachmentSource =
  (typeof TaskDocumentAttachmentSource)[keyof typeof TaskDocumentAttachmentSource];
