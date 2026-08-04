import {
  DocumentItemType,
  ViewLayout,
  DocumentSortBy,
} from "./documents.enums";

export interface DocumentItem {
  id: string;
  ownerUserId: string;
  ownerEmail: string;
  parentFolderId: string | null;
  projectId: string | null;
  name: string;
  type: DocumentItemType;
  s3Key: string | null;
  mimeType: string | null;
  sizeBytes: number;
  isStarred: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStorageQuota {
  userId: string;
  maxBytes: number;
  usedBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T;
  meta: {
    totalItems: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DocumentVersion {
  id: string;
  documentItemId: string;
  versionNumber: number;
  s3Key: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByEmail?: string;
  createdAt: string;
}

export { ViewLayout, DocumentSortBy };
