import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NotificationType,
  type Notification,
} from "../types/notification.types";
import {
  getContextNotificationDetails,
  getContextNotificationLink,
  getNotificationPermissionChange,
} from "./context-notification.utils";
import { getProjectTaskNotificationLink } from "./project-task-notification.utils";

const projectId = "00000000-0000-4000-8000-000000000001";
const documentId = "00000000-0000-4000-8000-000000000002";
const notification = {
  id: "noti",
  recipientId: "user",
  type: NotificationType.DOCUMENT_SHARED,
  title: "Shared",
  content: "Shared report",
  createdAt: "2026-11-10T00:00:00Z",
  updatedAt: "2026-11-10T00:00:00Z",
  isRead: false,
  metadata: {
    documentId,
    documentName: "Report",
    itemType: "FILE",
    permission: "VIEWER",
  },
} as Notification;

test("document notifications open the exact file or folder in Shared without trusting payload URLs", () => {
  assert.equal(
    getContextNotificationLink({
      ...notification,
      link: "javascript:alert(1)",
    }),
    `/documents?view=shared&documentId=${documentId}`,
  );
  assert.equal(
    getContextNotificationLink({
      ...notification,
      metadata: { ...notification.metadata, itemType: "FOLDER" },
    }),
    `/documents?view=shared&folderId=${documentId}`,
  );
  assert.equal(
    getContextNotificationLink({
      ...notification,
      metadata: { documentId: "javascript:alert(1)" },
    }),
    undefined,
  );
});
test("removed project members cannot navigate back through their notification", () => {
  assert.equal(
    getContextNotificationLink({
      ...notification,
      type: NotificationType.PROJECT_MEMBER_REMOVED,
      metadata: { projectId },
      link: `/projects/${projectId}`,
    }),
    undefined,
  );
});
test("permission details preserve the project and precise before/after values", () => {
  const details = getContextNotificationDetails({
    ...notification,
    type: NotificationType.PROJECT_PERMISSIONS_UPDATED,
    metadata: {
      projectName: "Workspace",
      changes: [{ label: "Edit documents", before: false, after: true }],
    },
  });
  assert.deepEqual(details, [
    { label: "Project", value: "Workspace" },
    { label: "Edit documents", value: "Not allowed → Allowed" },
  ]);
});
test("unassigned tasks still open the exact task, while deleted tasks open their project", () => {
  const context = { projectId, taskId: documentId };
  assert.equal(
    getProjectTaskNotificationLink({
      ...notification,
      type: NotificationType.PROJECT_TASK_UNASSIGNED,
      metadata: context,
    }),
    `/projects/${projectId}?taskId=${documentId}`,
  );
  assert.equal(
    getProjectTaskNotificationLink({
      ...notification,
      type: NotificationType.PROJECT_TASK_DELETED,
      metadata: context,
    }),
    `/projects/${projectId}`,
  );
});

test("document permission changes render as a single readable before-to-after row for both directions", () => {
  for (const [before, after, expected] of [["VIEWER", "EDITOR", "Viewer → Editor"], ["EDITOR", "VIEWER", "Editor → Viewer"]] as const) {
    const changed = { ...notification, type: NotificationType.DOCUMENT_PERMISSION_UPDATED, metadata: { previousPermission: before, permission: after } };
    assert.equal(getNotificationPermissionChange(changed), expected);
    assert.deepEqual(getContextNotificationDetails(changed), [{ label: "Permission", value: expected }]);
  }
});

test("share removal shows the old permission and removal time without opening a revoked document", () => {
  const removed = { ...notification, type: NotificationType.DOCUMENT_SHARE_REMOVED, link: `/documents?view=shared&documentId=${documentId}`, metadata: { ...notification.metadata, permission: null, previousPermission: "VIEWER", removedAt: "2026-11-11T00:00:00Z" } };
  assert.equal(getContextNotificationLink(removed), undefined);
  const details = getContextNotificationDetails(removed);
  assert.ok(details.some(detail => detail.label === "Previous permission" && detail.value === "Viewer"));
  assert.ok(details.some(detail => detail.label === "Removed on"));
});
