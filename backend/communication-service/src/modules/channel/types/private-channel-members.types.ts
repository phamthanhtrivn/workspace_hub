import { SpaceMember } from '@prisma/client';
import { UserProfileSnapshotResponse } from '../../user-profile-snapshot/types/user-profile-snapshot.types';

export interface PrivateChannelMembersResponse {
  ownerId: string | null;
  canManage: boolean;
  memberCount: number;
  members: Array<
    SpaceMember & {
      profile: UserProfileSnapshotResponse | null;
      nickname: string | null;
      joined: boolean;
    }
  >;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
