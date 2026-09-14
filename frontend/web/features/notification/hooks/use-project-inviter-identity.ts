import { useQuery } from "@tanstack/react-query";
import { getUserProfiles } from "@/features/project/api/project.api";
import type { Notification } from "../types/notification.types";

export function useProjectInviterIdentity(
  notification: Notification,
  fallbackName: string,
) {
  const senderId = notification.senderId;
  const profileQuery = useQuery({
    queryKey: ["users", "profile", senderId],
    queryFn: async () => {
      const profiles = await getUserProfiles(senderId ? [senderId] : []);
      return senderId ? profiles.get(senderId) : undefined;
    },
    enabled: Boolean(senderId && !notification.senderName),
    staleTime: 5 * 60 * 1_000,
  });

  return {
    name: notification.senderName || profileQuery.data?.fullName || fallbackName,
    avatar:
      notification.senderAvatar || profileQuery.data?.avatarUrl || undefined,
  };
}
