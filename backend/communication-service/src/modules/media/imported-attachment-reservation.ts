import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ChatAttachment } from '../../infrastructure/s3/attachment-upload.policy';

/** Serializes publication with abandoned-copy cleanup in the message transaction. */
export async function reserveImportedAttachments(
  tx: Prisma.TransactionClient,
  actorId: string,
  chatId: string,
  chatType: string,
  attachments: ChatAttachment[] = [],
) {
  const ids = new Set(
    attachments.flatMap((attachment) => {
      const match = attachment.s3Key.match(
        /^chat-media\/[a-f0-9-]{36}\/copy_([a-f0-9-]{36})_\d+$/i,
      );

      return match ? [match[1]] : [];
    }),
  );
  for (const id of ids) {
    const reserved = await tx.documentAttachmentImport.updateMany({
      where: { id, actorId, chatId, chatType, status: 'READY' },
      data: { updatedAt: new Date() },
    });
    if (!reserved.count)
      throw new BadRequestException(
        'The prepared copy has expired. Select the file again.',
      );
  }
}
