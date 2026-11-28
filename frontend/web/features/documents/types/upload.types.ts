import type { UploadState } from "./documents.enums";

export interface DocumentUploadEntry {
  id: string;
  fileName: string;
  sizeBytes: number;
  state: UploadState;
  progress: number;
  error?: string;
}

export interface DocumentVersionUploadTarget {
  documentId: string;
  isPublic: boolean;
}

export interface DocumentUploadDestination {
  folderId: string | null;
  projectId?: string;
  version?: DocumentVersionUploadTarget;
}

export interface PendingDocumentUpload {
  entry: DocumentUploadEntry;
  file: File;
  destination: DocumentUploadDestination;
}
