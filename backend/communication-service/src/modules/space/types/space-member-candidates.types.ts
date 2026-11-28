import { SpaceMember } from '@prisma/client';
import { UserProfileSnapshotResponse } from '../../user-profile-snapshot/types/user-profile-snapshot.types';

export interface SpaceMemberCandidatesResponse {
  members: Array<SpaceMember & { profile: UserProfileSnapshotResponse | null }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
