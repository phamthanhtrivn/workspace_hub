import {
  NotificationType,
  type MeetingInvitationMetadata,
  type MeetingInvitationNotificationStatus,
  type Notification,
} from "../types/notification.types";

export function getMeetingInvitationMetadata(
  notification: Notification,
): MeetingInvitationMetadata {
  return notification.metadata as unknown as MeetingInvitationMetadata;
}

export function getMeetingStatus(
  notification: Notification,
): MeetingInvitationNotificationStatus {
  const metadata = getMeetingInvitationMetadata(notification);
  if (metadata.status) return metadata.status;
  return notification.type === NotificationType.MEETING_CANCELLED
    ? "CANCELLED"
    : "PENDING";
}

export function getMeetingActionLabel(notification: Notification): string {
  if (notification.type === NotificationType.MEETING_UPDATED) {
    return "updated this meeting";
  }
  if (notification.type === NotificationType.MEETING_CANCELLED) {
    return "cancelled this meeting";
  }
  if (notification.type === NotificationType.MEETING_INVITATION_DECLINED) {
    return "declined this invitation";
  }
  return "invited you";
}

export function formatMeetingRange(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
): string {
  if (!startAt || !endAt) return "Time not set";
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Time not set";
  }

  return `${start.toLocaleDateString(undefined, {
    dateStyle: "medium",
  })}, ${start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function getMeetingHref(joinToken: string): string {
  return `/meetings?tab=upcoming&meeting=${encodeURIComponent(joinToken)}`;
}
