import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SharePermission } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DOCUMENT_ACCESS_ERRORS } from '../../common/constants/document-access.constants';
import { DocumentRole } from '../../common/enums/document.enum';
import { authorizeProject } from '../../common/auth/project-authorization';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { DocumentAccessService } from './document-access.service';
import { DOCUMENT_CHAT_SHARING } from './types/document-chat-sharing.constants';

@Injectable()
export class DocumentChatSharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly profiles: UserProfileSnapshotService,
  ) {}

  async prepareShare(
    userId: string,
    userEmail: string,
    documentId: string,
    recipientUserIds: string[],
  ): Promise<void> {
    const { item } = await this.access.getAccessContext(
      documentId,
      userId,
      userEmail,
    );
    if (item.isArchived)
      throw new ForbiddenException(DOCUMENT_ACCESS_ERRORS.UNAVAILABLE);
    const recipients = [...new Set(recipientUserIds)].filter(
      (id) => id !== userId,
    );

    if (item.projectId) {
      for (const recipientId of recipients) {
        try {
          await authorizeProject(recipientId, item.projectId);
        } catch (error) {
          if (error instanceof ForbiddenException)
            throw new ForbiddenException(
              DOCUMENT_CHAT_SHARING.PROJECT_ACCESS_REQUIRED,
            );
          throw error;
        }
      }

      return; // Project membership remains the sole source of document access.
    }

    if (item.ownerUserId !== userId)
      throw new ForbiddenException(DOCUMENT_CHAT_SHARING.OWNER_REQUIRED);
    const profiles = await this.profiles.getProfilesByUserIds(recipients);
    const grants: Array<{ userId: string; email: string }> = [];
    for (const recipientId of recipients) {
      const email = profiles.get(recipientId)?.email?.trim().toLowerCase();
      if (!email)
        throw new BadRequestException(
          DOCUMENT_CHAT_SHARING.RECIPIENT_UNAVAILABLE,
        );
      // Resolve using trusted profile identities, never client-supplied emails.
      try {
        const role = await this.access.getPermissionRole(
          documentId,
          recipientId,
          email,
        );
        // An explicit Viewer grant must not override inherited Editor access.
        if (role === DocumentRole.OWNER || role === DocumentRole.EDITOR)
          continue;
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error;
      }
      grants.push({ userId: recipientId, email });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const grant of grants) {
        const existing = await tx.documentShare.findFirst({
          where: {
            documentItemId: documentId,
            OR: [
              { shareWithUserId: grant.userId },
              { shareWithEmail: grant.email },
            ],
          },
        });
        if (
          existing?.shareWithUserId &&
          existing.shareWithUserId !== grant.userId
        ) {
          throw new BadRequestException(
            DOCUMENT_CHAT_SHARING.RECIPIENT_UNAVAILABLE,
          );
        }
        if (existing) continue;
        await tx.documentShare.upsert({
          where: {
            documentItemId_shareWithEmail: {
              documentItemId: documentId,
              shareWithEmail: grant.email,
            },
          },
          update: {}, // Preserve existing grants, including a concurrent Editor grant.
          create: {
            documentItemId: documentId,
            shareWithEmail: grant.email,
            shareWithUserId: grant.userId,
            permission: SharePermission.VIEWER,
          },
        });
      }
    });
  }
}
