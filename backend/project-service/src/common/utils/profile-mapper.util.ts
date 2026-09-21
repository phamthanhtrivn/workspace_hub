import { UserProfileSnapshotService } from "../../modules/user-profile-snapshot/user-profile-snapshot.service";
import { UserProfileInfo } from "../../modules/project/project.mapper";

/**
 * Collects user IDs from a collection of items and resolves all profile snapshots in a single query.
 */
export async function resolveProfilesForItems<T>(
  userProfiles: UserProfileSnapshotService,
  items: T[],
  extractUserIds: (
    item: T,
  ) => (string | undefined | null)[] | (string | undefined | null),
): Promise<Map<string, UserProfileInfo>> {
  const userIds = new Set<string>();
  for (const item of items) {
    if (!item) continue;
    const extracted = extractUserIds(item);
    if (Array.isArray(extracted)) {
      for (const id of extracted) {
        if (id) userIds.add(id);
      }
    } else if (extracted) {
      userIds.add(extracted);
    }
  }

  if (userIds.size === 0) {
    return new Map();
  }

  return userProfiles.getProfilesByUserIds([...userIds]);
}

/**
 * Collects user IDs from a single item and resolves profile snapshots.
 */
export async function resolveProfilesForItem<T>(
  userProfiles: UserProfileSnapshotService,
  item: T,
  extractUserIds: (
    item: T,
  ) => (string | undefined | null)[] | (string | undefined | null),
): Promise<Map<string, UserProfileInfo>> {
  return resolveProfilesForItems(userProfiles, [item], extractUserIds);
}
