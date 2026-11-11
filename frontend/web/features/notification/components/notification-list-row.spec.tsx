import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationListRow } from "./notification-list-row";
import {
  NotificationType,
  type Notification,
} from "../types/notification.types";

test("notification time is in the heading before the description and exposes its full date", () => {
  const notification: Notification = {
    id: "notification",
    recipientId: "recipient",
    type: NotificationType.DOCUMENT_SHARED,
    title: "Shared file",
    content: "Details",
    isRead: false,
    createdAt: "2026-11-11T00:00:00Z",
    updatedAt: "2026-11-11T00:00:00Z",
  };
  const markup = renderToStaticMarkup(
    <NotificationListRow
      notification={notification}
      title="Shared file"
      description="Sender details"
      badge={<span>Document</span>}
      onClick={() => undefined}
    />,
  );
  assert.ok(markup.indexOf("<time") < markup.indexOf("Sender details"));
  assert.match(markup, /dateTime="2026-11-11T00:00:00Z"/);
  assert.ok(
    markup.includes(
      `title="${new Date(notification.createdAt).toLocaleString()}"`,
    ),
  );
  assert.equal((markup.match(/<time\b/g) ?? []).length, 1);
});
