import { SpaceRole } from '@prisma/client';
import { UserProfileSnapshotResponse } from '../../user-profile-snapshot/types/user-profile-snapshot.types';

export interface ChannelMemberListItem {
  id: string;
  userId: string;
  joinedAt: Date;
  muted: boolean;
  pinned: boolean;
  nickname: string | null;
  role: SpaceRole;
  profile: UserProfileSnapshotResponse | null;
}

export interface ChannelMembersListResponse {
  total: number;
  admins: ChannelMemberListItem[];
  members: ChannelMemberListItem[];
  nextCursor: string | null;
}
