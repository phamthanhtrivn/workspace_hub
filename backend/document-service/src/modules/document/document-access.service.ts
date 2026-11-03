import { authorizeProject } from '../../common/auth/project-authorization';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DocumentItem,
  LinkAccess,
  DocumentShare,
} from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';

@Injectable()
export class DocumentAccessService {
  constructor(private readonly prisma: PrismaService) {}
  private async resolveRole(itemId: string, userId?: string, userEmail?: string, visited = new Set<string>()): Promise<{ item: DocumentItem & { shares: DocumentShare[] }; role: DocumentRole }> {
    if (visited.has(itemId)) throw new ForbiddenException('Invalid document hierarchy');
    visited.add(itemId);
    const item = await this.prisma.documentItem.findUnique({ where: { id: itemId }, include: { shares: true } });
    if (!item) throw new NotFoundException('Document or folder not found');
    if (item.projectId) {
      const access = await authorizeProject(userId, item.projectId);
      return { item, role: access.owner ? DocumentRole.OWNER : access.canEditDocuments ? DocumentRole.EDITOR : DocumentRole.VIEWER };
    }
    if (userId && item.ownerUserId === userId) return { item, role: DocumentRole.OWNER };
    if (item.isArchived) throw new ForbiddenException('Document unavailable');
    const share = userId && item.shares.find(s => s.shareWithUserId ? s.shareWithUserId === userId : Boolean(userEmail && s.shareWithEmail.toLowerCase() === userEmail.toLowerCase()));
    if (share && userId) {
      if (!share.shareWithUserId) {
        // HTTP identity is already verified. Claim a pending email grant once, then use the stable user id.
        const claimed = await this.prisma.documentShare.updateMany({
          where: { id: share.id, shareWithUserId: null, shareWithEmail: share.shareWithEmail },
          data: { shareWithUserId: userId },
        });
        if (!claimed.count) {
          const current = await this.prisma.documentShare.findUnique({ where: { id: share.id } });
          if (current?.shareWithUserId !== userId) throw new ForbiddenException('Share is no longer available');
        }
      }
      return { item, role: share.permission as DocumentRole };
    }
    if (item.parentFolderId) {
      try {
        const inherited = await this.resolveRole(item.parentFolderId, userId, userEmail, visited);
        if (inherited.role !== DocumentRole.VIEWER) return { item, role: inherited.role };
        // A valid viewer grant is enough for viewing this child.
        return { item, role: DocumentRole.VIEWER };
      } catch (error) { if (!(error instanceof ForbiddenException)) throw error; }
    }
    if (item.linkAccess !== LinkAccess.NONE && (!item.shareExpiresAt || item.shareExpiresAt > new Date()))
      return { item, role: DocumentRole.VIEWER };
    throw new ForbiddenException('You are not allowed to access this item');
  }

  async getPermissionRole(itemId: string, userId?: string, userEmail?: string): Promise<DocumentRole> {
    return (await this.resolveRole(itemId, userId, userEmail)).role;
  }

  async checkPermission(itemId: string, userId?: string, userEmail?: string, requiredRole: DocumentRole = DocumentRole.VIEWER): Promise<DocumentItem & { shares: DocumentShare[] }> {
    const { item, role } = await this.resolveRole(itemId, userId, userEmail);
    if (requiredRole === DocumentRole.OWNER && role !== DocumentRole.OWNER)
      throw new ForbiddenException('Only the owner can perform this action');
    if (requiredRole === DocumentRole.EDITOR && role === DocumentRole.VIEWER)
      throw new ForbiddenException('Named editor permission is required');
    return item;
  }

  async filterReadable<T extends { id: string }>(items: T[], userId: string, userEmail: string): Promise<T[]> {
    const visible: T[] = [];
    for (const item of items) {
      try { await this.checkPermission(item.id, userId, userEmail); visible.push(item); }
      catch (error) { if (!(error instanceof ForbiddenException || error instanceof NotFoundException)) throw error; }
    }
    return visible;
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
