import { SpaceRole } from "../types/chat.enums";
import type { ChannelResponse, SpaceResponse } from "../types/chat.types";

export function canLeaveSpaceChannel(
  channel: ChannelResponse,
  currentUserId: string | null,
  space?: Pick<SpaceResponse, "id" | "createdBy" | "projectId"> | null,
): boolean {
  const member = channel.members?.find(({ userId }) => userId === currentUserId);
  if (!currentUserId || !member) return false;
  if (!channel.isDefault) return true;

  // A default-channel exit removes space membership. Wait for space metadata.
  return Boolean(
    space?.id === channel.spaceId &&
      space.createdBy &&
      !space.projectId &&
      !channel.projectId &&
      space.createdBy !== currentUserId &&
      member.role !== SpaceRole.ADMIN,
  );
}
