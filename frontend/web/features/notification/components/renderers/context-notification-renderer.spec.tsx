import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ContextNotificationListItem } from "./context-notification-renderer";
import {
  NotificationType,
  type Notification,
} from "../../types/notification.types";

test("permission-change list items show one readable transition instead of a raw current permission", () => {
  const notification: Notification = {
    id: "notification",
    recipientId: "recipient",
    senderName: "Owner",
    type: NotificationType.DOCUMENT_PERMISSION_UPDATED,
    title: "Document sharing permission changed",
    content: "Your permission: EDITOR.",
    createdAt: "2026-11-11T00:00:00Z",
    updatedAt: "2026-11-11T00:00:00Z",
    isRead: false,
    metadata: {
      documentName: "Report.pdf",
      itemType: "FILE",
      previousPermission: "VIEWER",
      permission: "EDITOR",
    },
  };
  const markup = renderToStaticMarkup(
    <ContextNotificationListItem
      notification={notification}
      onClick={() => undefined}
    />,
  );
  assert.ok(markup.includes("Permission: Viewer → Editor"));
  assert.doesNotMatch(markup, /Your permission: EDITOR|Previous permission/);
});
