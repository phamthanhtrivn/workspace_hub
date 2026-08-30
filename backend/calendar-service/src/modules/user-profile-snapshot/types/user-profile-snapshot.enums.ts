export enum UserProfileSnapshotEventType {
  UPSERTED = 'USER_PROFILE_SNAPSHOT_UPSERTED',
  REMOVED = 'USER_PROFILE_SNAPSHOT_REMOVED',
  DISABLED = 'USER_PROFILE_SNAPSHOT_DISABLED',
}

export enum UserProfileSnapshotErrorMessage {
  INVALID_EVENT = 'Invalid user profile snapshot event',
  MISSING_USER_ID = 'Missing userId in user profile snapshot event',
}
