import { ChannelVisibility, Prisma } from '@prisma/client';
import { KAFKA_EVENTS } from '../../common/constants/kafka.constants';
import { PRIVATE_CHANNEL_OWNERSHIP_NOTIFICATION } from './types/channel.enums';

// Capture the transition in its transaction, then publish only after commit.
export async function createPrivateChannelOwnershipNotification(
  tx: Prisma.TransactionClient,
  channel: {
    id: string;
    name: string;
    spaceId: string;
    ownerId: string | null;
  },
  newOwnerId: string | null,
) {
  if (!newOwnerId || !channel.ownerId || newOwnerId === channel.ownerId)
    return null;
  const [profiles, space] = await Promise.all([
    tx.userProfileSnapshot.findMany({
      where: { userId: channel.ownerId },
      select: { userId: true, fullName: true, email: true, avatarUrl: true },
    }),
    tx.space.findUnique({
      where: { id: channel.spaceId },
      select: { name: true },
    }),
  ]);
  const previousOwner = profiles.find(
    (profile) => profile.userId === channel.ownerId,
  );
  const senderName =
    previousOwner?.fullName ||
    previousOwner?.email ||
    'The previous channel owner';
  const spaceName = space?.name || 'your space';
  return {
    recipientId: newOwnerId,
    senderId: channel.ownerId,
    senderName,
    senderAvatar: previousOwner?.avatarUrl,
    type: KAFKA_EVENTS.NOTIFICATION.CHANNEL_OWNERSHIP_TRANSFERRED,
    title: PRIVATE_CHANNEL_OWNERSHIP_NOTIFICATION.TITLE,
    content: PRIVATE_CHANNEL_OWNERSHIP_NOTIFICATION.CONTENT(
      channel.name,
      spaceName,
      senderName,
    ),
    link: `/chat?spaceId=${channel.spaceId}&channelId=${channel.id}`,
    metadata: {
      channelId: channel.id,
      channelName: channel.name,
      spaceId: channel.spaceId,
      spaceName,
      previousOwnerId: channel.ownerId,
      newOwnerId,
      visibility: ChannelVisibility.PRIVATE,
    },
  };
}

export type PrivateChannelOwnershipNotification = Awaited<
  ReturnType<typeof createPrivateChannelOwnershipNotification>
>;
