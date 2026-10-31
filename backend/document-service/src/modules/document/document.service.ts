import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { EnsureProjectRootFolderDto } from './dto/ensure-project-root-folder.dto';
import {
  ItemType,
  DocumentItem,
  DocumentVersion,
  SharePermission,
  LinkAccess,
  DocumentShare,
} from '@prisma/client';
import { DocumentRole, DocumentSortBy } from '../../common/enums/document.enum';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';
import { DocumentAccessService } from './document-access.service';
import { DocumentLocationService } from './document-location.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentPresentationService } from './document-presentation.service';
import { DocumentTreeService } from './document-tree.service';
import { DocumentQueryService } from './document-query.service';
import { DocumentPublicQueryService } from './document-public-query.service';
import { DocumentUploadService } from './document-upload.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentSharingService } from './document-sharing.service';
import { ProjectDocumentAttachmentService } from './project-document-attachment.service';
import { DocumentDownloadService } from './document-download.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly access: DocumentAccessService,
    private readonly locations: DocumentLocationService,
    private readonly events: DocumentEventPublisher,
    private readonly presentation: DocumentPresentationService,
    private readonly tree: DocumentTreeService,
    private readonly queries: DocumentQueryService,
    private readonly publicQueries: DocumentPublicQueryService,
    private readonly uploads: DocumentUploadService,
    private readonly lifecycle: DocumentLifecycleService,
    private readonly sharing: DocumentSharingService,
    private readonly projectAttachments: ProjectDocumentAttachmentService,
    private readonly downloads: DocumentDownloadService,
  ) {}
  async initiateUpload(
    userId: string,
    userEmail: string,
    dto: InitiateUploadDto,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    return this.uploads.initiateUpload(userId, userEmail, dto);
  }

  async resolveTaskAttachmentDocuments(
    userId: string,
    userEmail: string,
    projectId: string,
    documentItemIds: string[],
  ) {
    return this.projectAttachments.resolveTaskAttachmentDocuments(
      userId,
      userEmail,
      projectId,
      documentItemIds,
    );
  }

  async importTaskAttachmentDocuments(
    userId: string,
    userEmail: string,
    projectId: string,
    documentItemIds: string[],
    operationId?: string,
  ) {
    return this.projectAttachments.importTaskAttachmentDocuments(
      userId,
      userEmail,
      projectId,
      documentItemIds,
      operationId,
    );
  }

  async confirmUpload(
    userId: string,
    userEmail: string,
    dto: ConfirmUploadDto,
  ): Promise<DocumentItem> {
    return this.uploads.confirmUpload(userId, userEmail, dto);
  }

  async getNameConflict(
    userId: string,
    userEmail: string,
    options: {
      name: string;
      parentFolderId?: string;
      projectId?: string;
    },
  ) {
    return this.locations.getNameConflict(userId, userEmail, options);
  }

  async getPermissionRole(
    itemId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<DocumentRole> {
    return this.access.getPermissionRole(itemId, userId, userEmail);
  }

  async checkPermission(
    itemId: string,
    userId?: string,
    userEmail?: string,
    requiredRole: DocumentRole = DocumentRole.VIEWER,
  ): Promise<DocumentItem & { shares: DocumentShare[] }> {
    return this.access.checkPermission(itemId, userId, userEmail, requiredRole);
  }

  async isDescendant(
    descendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    return this.tree.isDescendant(descendantId, ancestorId);
  }

  async ensureProjectRootFolder(
    projectId: string,
    dto: EnsureProjectRootFolderDto,
  ): Promise<DocumentItem> {
    return this.projectAttachments.ensureProjectRootFolder(projectId, dto);
  }

  async createFolder(
    userId: string,
    userEmail: string,
    dto: CreateFolderDto,
  ): Promise<DocumentItem> {
    return this.lifecycle.createFolder(userId, userEmail, dto);
  }

  async getItems(
    userId: string,
    userEmail: string,
    options: {
      folderId?: string;
      isStarredOnly?: boolean;
      isArchived?: boolean;
      projectId?: string;
      isSharedOnly?: boolean;
      page?: number;
      limit?: number;
      sortBy?: DocumentSortBy;
      search?: string;
    },
  ): Promise<{
    items: Array<Omit<DocumentItem, 'sizeBytes'> & { sizeBytes: number }>;
    totalCount: number;
  }> {
    return this.queries.getItems(userId, userEmail, options);
  }

  async getSharedWithMe(
    userId: string,
    userEmail: string,
  ): Promise<DocumentItem[]> {
    return this.queries.getSharedWithMe(userId, userEmail);
  }

  async renameItem(
    userId: string,
    userEmail: string,
    id: string,
    dto: RenameItemDto,
  ): Promise<DocumentItem> {
    return this.lifecycle.renameItem(userId, userEmail, id, dto);
  }

  async moveItem(
    userId: string,
    userEmail: string,
    id: string,
    dto: MoveItemDto,
  ): Promise<DocumentItem> {
    return this.lifecycle.moveItem(userId, userEmail, id, dto);
  }

  async archiveItem(
    userId: string,
    userEmail: string,
    id: string,
    archive: boolean,
  ): Promise<DocumentItem> {
    return this.lifecycle.archiveItem(userId, userEmail, id, archive);
  }

  async toggleStar(
    userId: string,
    userEmail: string,
    id: string,
    isStarred: boolean,
  ) {
    return this.lifecycle.toggleStar(userId, userEmail, id, isStarred);
  }

  async deleteItemPermanently(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<void> {
    return this.lifecycle.deleteItemPermanently(userId, userEmail, id);
  }

  async getPreviewUrl(
    userId: string | undefined,
    userEmail: string | undefined,
    id: string,
    versionId?: string,
  ): Promise<string> {
    return this.downloads.getPreviewUrl(userId, userEmail, id, versionId);
  }

  async getDownloadUrl(
    userId: string | undefined,
    userEmail: string | undefined,
    id: string,
    versionId?: string,
  ): Promise<string> {
    return this.downloads.getDownloadUrl(userId, userEmail, id, versionId);
  }

  async getVersions(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<
    Array<
      DocumentVersion & {
        uploadedByEmail: string;
        uploaderProfile: UserProfileSnapshotResponse | null;
      }
    >
  > {
    return this.queries.getVersions(userId, userEmail, id);
  }

  async createVersion(
    userId: string,
    userEmail: string,
    id: string,
    dto: CreateVersionDto,
  ): Promise<
    DocumentVersion & { uploaderProfile: UserProfileSnapshotResponse | null }
  > {
    return this.uploads.createVersion(userId, userEmail, id, dto);
  }

  async getSharing(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<{
    linkAccess: LinkAccess;
    shares: Array<
      DocumentShare & { shareWithProfile: UserProfileSnapshotResponse | null }
    >;
  }> {
    return this.sharing.getSharing(userId, userEmail, id);
  }

  async updateLinkAccess(
    userId: string,
    userEmail: string,
    id: string,
    linkAccess: LinkAccess,
  ): Promise<DocumentItem> {
    return this.sharing.updateLinkAccess(userId, userEmail, id, linkAccess);
  }

  async addShare(
    userId: string,
    userEmail: string,
    id: string,
    shareEmail: string,
    permission: SharePermission,
  ): Promise<DocumentShare> {
    return this.sharing.addShare(userId, userEmail, id, shareEmail, permission);
  }

  async removeShare(
    userId: string,
    userEmail: string,
    id: string,
    shareId: string,
  ): Promise<void> {
    return this.sharing.removeShare(userId, userEmail, id, shareId);
  }

  async getPublicDocument(
    id: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{
    item: {
      id: string;
      name: string;
      type: ItemType;
      sizeBytes: number;
      containedSizeBytes?: number;
      mimeType: string | null;
      ownerEmail: string;
      createdAt: Date;
      linkAccess: LinkAccess;
    };
    userRole: DocumentRole;
  }> {
    return this.publicQueries.getPublicDocument(id, userId, userEmail);
  }

  async getPublicVersions(id: string, userId?: string, userEmail?: string) {
    return this.publicQueries.getPublicVersions(id, userId, userEmail);
  }

  async createPublicVersion(
    id: string,
    dto: CreateVersionDto,
    userId?: string,
    userEmail?: string,
  ): Promise<Omit<DocumentVersion, 'sizeBytes'> & { sizeBytes: number }> {
    return this.uploads.createPublicVersion(id, dto, userId, userEmail);
  }

  async renamePublicItem(
    id: string,
    dto: RenameItemDto,
    userId?: string,
    userEmail?: string,
  ): Promise<DocumentItem> {
    return this.lifecycle.renamePublicItem(id, dto, userId, userEmail);
  }

  async initiatePublicUpload(
    id: string,
    dto: InitiateUploadDto,
    userId?: string,
    userEmail?: string,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    return this.uploads.initiatePublicUpload(id, dto, userId, userEmail);
  }

  async downloadFolderAsZip(
    userId: string | undefined,
    userEmail: string | undefined,
    folderId: string,
    res: Response,
  ): Promise<void> {
    return this.downloads.downloadFolderAsZip(userId, userEmail, folderId, res);
  }

  async getPublicFolderChildren(
    rootId: string,
    folderId: string,
    userId?: string,
    userEmail?: string,
  ) {
    return this.publicQueries.getPublicFolderChildren(
      rootId,
      folderId,
      userId,
      userEmail,
    );
  }

  async getChatMetadata(
    id: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{
    id: string;
    name: string;
    type: ItemType;
    sizeBytes: number;
    containedSizeBytes?: number;
    mimeType: string | null;
    ownerEmail: string;
    ownerName: string | null;
    createdAt: Date;
    hasPermission: boolean;
  }> {
    return this.queries.getChatMetadata(id, userId, userEmail);
  }

  async checkEmailsPermissions(
    id: string,
    emails: string[],
    userId: string,
    userEmail: string,
  ): Promise<string[]> {
    return this.access.checkEmailsPermissions(id, emails, userId, userEmail);
  }

  async addSharesBatch(
    userId: string,
    userEmail: string,
    id: string,
    emails: string[],
    permission: SharePermission,
  ): Promise<DocumentShare[]> {
    return this.sharing.addSharesBatch(
      userId,
      userEmail,
      id,
      emails,
      permission,
    );
  }

  async getFolderAncestors(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<{ id: string; name: string }[]> {
    return this.queries.getFolderAncestors(userId, userEmail, id);
  }
}
