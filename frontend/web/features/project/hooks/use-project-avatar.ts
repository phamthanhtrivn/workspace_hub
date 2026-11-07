"use client";

import { useAppSelector } from "@/store/store";
import { useUserProfileQuery } from "@/features/user-setting/hooks/useUserSettingQueries";

export function useProjectAvatar(userId: string, avatarUrl?: string | null): string | undefined {
  const currentUserId = useAppSelector(state => state.auth.userId);
  const currentEmail = useAppSelector(state => state.auth.email);
  const hasToken = useAppSelector(state => Boolean(state.auth.accessToken));
  const isCurrentUser = userId === currentUserId;
  // All self avatars share one cached profile request. Other users keep their
  // project/profile source; no request is made for each member.
  const { data } = useUserProfileQuery({ enabled: isCurrentUser && hasToken });
  const savedProfile = data?.data;
  const hasSavedProfile = isCurrentUser && data?.success && currentEmail && savedProfile?.email &&
    savedProfile.email.trim().toLowerCase() === currentEmail.trim().toLowerCase();

  // An explicitly empty saved avatar must also override a stale Kafka snapshot.
  const source = hasSavedProfile ? savedProfile.avatarUrl : avatarUrl;
  return source?.trim() || undefined;
}
