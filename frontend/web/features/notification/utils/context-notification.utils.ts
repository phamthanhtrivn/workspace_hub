import {
  NotificationType,
  type Notification,
} from "../types/notification.types";
import { isProjectResourceId } from "../../project/utils/project-task-link";
import { SharePermission } from "../../documents/types/documents.enums";

export interface NotificationDetail {
  label: string;
  value: string;
}

function display(value: unknown): string {
  if (value === true) return "Allowed";
  if (value === false) return "Not allowed";
  if (value == null || value === "") return "None";

  return typeof value === "string" ? value : JSON.stringify(value);
}

function permissionLabel(value: unknown): string {
  if (value === SharePermission.VIEWER) return "Viewer";
  if (value === SharePermission.EDITOR) return "Editor";

  return display(value);
}

export function getNotificationPermissionChange(notification: Notification): string | undefined {
  const metadata = notification.metadata ?? {};
  if (notification.type !== NotificationType.DOCUMENT_PERMISSION_UPDATED ||
    metadata.previousPermission == null || metadata.permission == null) return undefined;

  return `${permissionLabel(metadata.previousPermission)} → ${permissionLabel(metadata.permission)}`;
}

export function getContextNotificationDetails(
  notification: Notification,
): NotificationDetail[] {
  const metadata = notification.metadata ?? {};
  const details: NotificationDetail[] = [];
  const add = (label: string, value: unknown) => {
    if (value != null) details.push({ label, value: display(value) });
  };
  add("Project", metadata.projectName);
  add(
    metadata.itemType === "FOLDER" ? "Folder" : "File",
    metadata.documentName,
  );
  if (metadata.documentName) {
    add(
      "Type",
      metadata.itemType === "FOLDER" ? "Folder" : metadata.mimeType || "File",
    );
    if (metadata.itemType !== "FOLDER" && metadata.sizeBytes != null) {
      const bytes = Number(metadata.sizeBytes);
      if (Number.isFinite(bytes))
        add("Size", `${new Intl.NumberFormat().format(bytes)} bytes`);
    }
  }
  if (notification.type === NotificationType.DOCUMENT_SHARE_REMOVED) {
    if (metadata.previousPermission != null) add("Previous permission", permissionLabel(metadata.previousPermission));
  } else if (metadata.permission != null) {
    add("Permission", getNotificationPermissionChange(notification) ?? permissionLabel(metadata.permission));
  }
  add("Response", metadata.status);
  for (const [field, label] of [
    ["invitedAt", "Invited on"],
    ["respondedAt", "Responded on"],
    ["sharedAt", "Shared on"],
    ["removedAt", "Removed on"],
  ] as const) {
    const value = metadata[field];
    if (typeof value === "string" && Number.isFinite(Date.parse(value)))
      add(label, new Date(value).toLocaleString());
  }
  if (Array.isArray(metadata.changes)) {
    for (const change of metadata.changes) {
      if (
        !change ||
        typeof change !== "object" ||
        !("label" in change) ||
        typeof change.label !== "string"
      )
        continue;
      add(change.label, `${display(change.before)} → ${display(change.after)}`);
    }
  }

  return details;
}

export function getContextNotificationLink(
  notification: Notification,
): string | undefined {
  const metadata = notification.metadata ?? {};
  if (notification.type === NotificationType.PROJECT_MEMBER_REMOVED ||
    notification.type === NotificationType.DOCUMENT_SHARE_REMOVED)
    return undefined;
  if (
    notification.type.startsWith("DOCUMENT_") &&
    typeof metadata.documentId === "string" &&
    isProjectResourceId(metadata.documentId)
  ) {
    return `/documents?view=shared&${metadata.itemType === "FOLDER" ? "folderId" : "documentId"}=${metadata.documentId}`;
  }
  if (
    typeof metadata.projectId === "string" &&
    isProjectResourceId(metadata.projectId)
  )
    return `/projects/${metadata.projectId}`;

  return undefined;
}
