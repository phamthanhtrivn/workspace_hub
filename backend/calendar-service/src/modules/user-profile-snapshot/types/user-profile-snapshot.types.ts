import { UserProfileSnapshotEventType } from './user-profile-snapshot.enums';

export interface UserProfileSnapshotPayload {
  eventType: UserProfileSnapshotEventType;
  userId: string;
  eventId?: string;
  schemaVersion?: number;
  revision?: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  occurredAt?: string | null;
}

export interface UserProfileSnapshotResponse {
  id: string;
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}
