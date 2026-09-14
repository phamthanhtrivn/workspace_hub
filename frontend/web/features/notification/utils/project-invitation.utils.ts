import type {
  Notification,
  ProjectInvitationMetadata,
} from "../types/notification.types";

const expiryDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatProjectInvitationExpiryDate(date: string): string {
  return expiryDateFormatter.format(new Date(date));
}

export function getProjectInvitationMetadata(
  notification: Notification,
): ProjectInvitationMetadata {
  return notification.metadata as unknown as ProjectInvitationMetadata;
}

export function getProjectColor(value?: string | null): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : "#0052CC";
}

export function getProjectInviterInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
