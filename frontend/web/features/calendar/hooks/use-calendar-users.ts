import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  getPublicProfile,
  searchUserByEmail,
} from "@/features/chat/api/chat.api";
import { CalendarEvent, UserProfileSnapshot } from "../types/calendar.types";

const CALENDAR_USER_STALE_TIME_MS = 5 * 60 * 1000;

const calendarUserKeys = {
  profile: (userId: string) => ["calendar", "users", userId] as const,
  search: (query: string) => ["calendar", "users", "search", query] as const,
};

function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

export function useAttendeeSearch(query: string) {
  const normalizedQuery = useDebouncedValue(query.trim(), 350);

  return useQuery({
    queryKey: calendarUserKeys.search(normalizedQuery),
    queryFn: async () => {
      const response = await searchUserByEmail(normalizedQuery);
      return response.success ? response.data : [];
    },
    enabled: normalizedQuery.length > 0,
    staleTime: CALENDAR_USER_STALE_TIME_MS,
  });
}

export function useAttendeeProfiles(
  event: CalendarEvent | null,
  enabled: boolean,
) {
  const userIds = useMemo(
    () =>
      Array.from(
        new Set(
          (event?.attendees ?? [])
            .filter(
              (attendee) =>
                attendee.userId !== event?.createdBy &&
                !attendee.profile?.fullName,
            )
            .map((attendee) => attendee.userId),
        ),
      ),
    [event],
  );
  const profileQueries = useQueries({
    queries: userIds.map((userId) => ({
      queryKey: calendarUserKeys.profile(userId),
      queryFn: async () => {
        const response = await getPublicProfile(userId);
        return {
          id: userId,
          userId,
          email: response.data.email,
          fullName: response.data.fullName,
          avatarUrl: response.data.avatarUrl,
        } satisfies UserProfileSnapshot;
      },
      enabled,
      staleTime: CALENDAR_USER_STALE_TIME_MS,
    })),
  });

  return useMemo(
    () =>
      profileQueries.reduce<Record<string, UserProfileSnapshot>>(
        (profiles, query, index) => {
          if (query.data) profiles[userIds[index]] = query.data;
          return profiles;
        },
        {},
      ),
    [profileQueries, userIds],
  );
}
