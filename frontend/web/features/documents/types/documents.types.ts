import { LucideIcon } from "lucide-react";
import {
  DocumentItemType,
  ViewLayout,
  DocumentSortBy,
  LinkAccess,
  SharePermission,
  DocumentRole,
} from "./documents.enums";

export interface UserProfileSnapshotResponse {
  id: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

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
  linkAccess?: LinkAccess;
  userRole?: DocumentRole;
  ownerProfile?: UserProfileSnapshotResponse | null;
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
  uploaderProfile?: UserProfileSnapshotResponse | null;
}

export interface DocumentShare {
  id: string;
  documentItemId: string;
  shareWithUserId: string | null;
  shareWithEmail: string;
  permission: SharePermission;
  createdAt: string;
  updatedAt: string;
  shareWithProfile?: UserProfileSnapshotResponse | null;
}

export interface SharingSettings {
  linkAccess: LinkAccess;
  shares: DocumentShare[];
}

export interface StorageQuotaStats {
  usedMB: string;
  maxGB: string;
  percentage: number;
}

export interface DocumentRoleMetadata {
  badgeText: string;
  badgeColor: string;
  Icon: LucideIcon;
  showOpenInWorkspace: boolean;
}

export { ViewLayout, DocumentSortBy };
