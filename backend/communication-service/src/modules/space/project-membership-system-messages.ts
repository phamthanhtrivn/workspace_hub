import { Message, MessageType, Prisma } from '@prisma/client';

export async function createProjectRemovalMessages(
  tx: Prisma.TransactionClient,
  channelId: string,
  systemSenderId: string,
  removedUserIds: string[],
) {
  const profiles = removedUserIds.length
    ? await tx.userProfileSnapshot.findMany({
        where: { userId: { in: removedUserIds } },
        select: { userId: true, fullName: true, email: true },
      })
    : [];
  const names = new Map(
    profiles.map((profile) => [
      profile.userId,
      profile.fullName || profile.email || 'A member',
    ]),
  );
  const messages: Message[] = [];
  for (const userId of removedUserIds)
    messages.push(
      await tx.message.create({
        data: {
          channelId,
          senderId: systemSenderId,
          type: MessageType.SYSTEM,
          content: `${names.get(userId) || 'A member'} was removed from this project and no longer has access to its space.`,
        },
      }),
    );
  if (messages.length)
    await tx.channel.update({
      where: { id: channelId },
      data: { updatedAt: new Date() },
    });

  return messages;
}
