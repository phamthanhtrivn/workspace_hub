import type {
  Notification,
  NotificationReadFilter,
} from "../types/notification.types";

export function formatNotificationCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function getReadFilterValue(
  tab: NotificationReadFilter,
): boolean | undefined {
  if (tab === "UNREAD") return false;
  if (tab === "READ") return true;
  return undefined;
}

export function getNotificationApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export function getSpaceInvitationInitials(name?: string | null): string {
  const source = name?.trim() || "Workspace";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function getCalendarReminderTitle(notification: Notification): string {
  return (
    (notification.metadata?.eventTitle as string | undefined) ||
    notification.title ||
    "Calendar reminder"
  );
}
