import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DocumentItem,
  SharePermission,
  LinkAccess,
  DocumentShare,
} from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';

@Injectable()
export class DocumentAccessService {
  constructor(private readonly prisma: PrismaService) {}
  async getPermissionRole(
    itemId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<DocumentRole> {
    const item = await this.prisma.documentItem.findUnique({
      where: { id: itemId },
      include: {
        shares: true,
      },
    });

    if (!item) {
      return DocumentRole.VIEWER;
    }

    // 1. Owner always has full access
    if (userId && item.ownerUserId === userId) {
      return DocumentRole.OWNER;
    }

    // 2. Check if shared explicitly with this user/email
    const share = item.shares.find(
      (s) =>
        (userId && s.shareWithUserId === userId) ||
        (userEmail &&
          s.shareWithEmail.toLowerCase() === userEmail.toLowerCase()),
    );

    if (share) {
      return share.permission as DocumentRole;
    }

    // 3. Check public link sharing if enabled
    if (item.linkAccess !== LinkAccess.NONE) {
      return item.linkAccess as DocumentRole;
    }

    // 4. Fallback: Check parent folder recursively (inheritance)
    if (item.parentFolderId) {
      return this.getPermissionRole(item.parentFolderId, userId, userEmail);
    }

    return DocumentRole.VIEWER;
  }

  async checkPermission(
    itemId: string,
    userId?: string,
    userEmail?: string,
    requiredRole: DocumentRole = DocumentRole.VIEWER,
  ): Promise<DocumentItem & { shares: DocumentShare[] }> {
    const item = await this.prisma.documentItem.findUnique({
      where: { id: itemId },
      include: {
        shares: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Document or folder not found');
    }

    // 1. Owner always has full access
    if (userId && item.ownerUserId === userId) {
      return item;
    }

    // 2. Check if shared explicitly with this user/email
    const share = item.shares.find(
      (s) =>
        (userId && s.shareWithUserId === userId) ||
        (userEmail &&
          s.shareWithEmail.toLowerCase() === userEmail.toLowerCase()),
    );

    if (share) {
      if (requiredRole === DocumentRole.OWNER) {
        throw new ForbiddenException('Only the owner can perform this action');
      }
      if (
        requiredRole === DocumentRole.EDITOR &&
        share.permission !== SharePermission.EDITOR
      ) {
        throw new ForbiddenException(
          'You are not allowed to edit this document',
        );
      }
      return item;
    }

    // 3. Check public link sharing if enabled
    if (item.linkAccess !== LinkAccess.NONE) {
      if (requiredRole === DocumentRole.OWNER) {
        throw new ForbiddenException('Only the owner can perform this action');
      }
      if (
        requiredRole === DocumentRole.EDITOR &&
        item.linkAccess !== LinkAccess.EDITOR
      ) {
        throw new ForbiddenException(
          'This document can only be viewed through a link',
        );
      }
      // Check link expiration
      if (item.shareExpiresAt && new Date() > item.shareExpiresAt) {
        throw new ForbiddenException('Share link has expired');
      }
      return item;
    }

    // 4. Fallback: Check parent folder recursively (inheritance)
    if (item.parentFolderId) {
      await this.checkPermission(
        item.parentFolderId,
        userId,
        userEmail,
        requiredRole,
      );
      return item;
    }

    throw new ForbiddenException('You are not allowed to access this item');
  }

  assertPersonalDocumentFeature(
    item: Pick<DocumentItem, 'projectId'>,
    feature: string,
  ): void {
    if (item.projectId) {
      throw new BadRequestException(
        `${feature} not available for project documents`,
      );
    }
  }

  async checkPersonalOwnerFeature(
    itemId: string,
    userId: string,
    userEmail: string,
    feature: string,
  ): Promise<DocumentItem & { shares: DocumentShare[] }> {
    const item = await this.checkPermission(
      itemId,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );
    this.assertPersonalDocumentFeature(item, feature);
    if (item.ownerUserId !== userId) {
      throw new ForbiddenException('Only the owner can perform this action');
    }
    return item;
  }

  async checkEmailAccessRecursively(
    itemId: string,
    email: string,
  ): Promise<boolean> {
    const item = await this.prisma.documentItem.findUnique({
      where: { id: itemId },
      include: { shares: true },
    });

    if (!item) return false;

    // 1. Owner always has access
    if (item.ownerEmail.toLowerCase() === email.toLowerCase()) {
      return true;
    }

    // 2. Explicit share
    const share = item.shares.find(
      (s) => s.shareWithEmail.toLowerCase() === email.toLowerCase(),
    );
    if (share) return true;

    // 3. Public link access
    if (item.linkAccess !== LinkAccess.NONE) {
      if (!item.shareExpiresAt || new Date() <= item.shareExpiresAt) {
        return true;
      }
    }

    // 4. Inherited from parent folder
    if (item.parentFolderId) {
      return this.checkEmailAccessRecursively(item.parentFolderId, email);
    }

    return false;
  }

  async checkEmailsPermissions(
    id: string,
    emails: string[],
    userId: string,
    userEmail: string,
  ): Promise<string[]> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    // If public sharing is enabled, everyone has access
    if (item.linkAccess !== LinkAccess.NONE) {
      if (!item.shareExpiresAt || new Date() <= item.shareExpiresAt) {
        return [];
      }
    }

    const unauthorizedEmails: string[] = [];
    for (const email of emails) {
      const hasAccess = await this.checkEmailAccessRecursively(id, email);
      if (!hasAccess) {
        unauthorizedEmails.push(email);
      }
    }

    return unauthorizedEmails;
  }
}
