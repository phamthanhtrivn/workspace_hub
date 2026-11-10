import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FileText } from "lucide-react";
import {
  FaFileExcel,
  FaFileImage,
  FaFilePdf,
  FaFileWord,
  FaFolder,
} from "react-icons/fa";
import { NotificationCategoryIcon } from "./notification-category-icon";
import { NotificationListRow } from "./notification-list-row";
import {
  NotificationType,
  type Notification,
} from "../types/notification.types";

const base: Notification = {
  id: "notification",
  recipientId: "recipient",
  type: NotificationType.DOCUMENT_SHARED,
  title: "Resource shared",
  content: "A resource was shared with you",
  isRead: false,
  createdAt: "2026-11-10T00:00:00Z",
  updatedAt: "2026-11-10T00:00:00Z",
};

function svg(markup: string): string {
  const match = markup.match(/<svg\b[\s\S]*?<\/svg>/);
  assert.ok(match, "Expected a file icon SVG");

  return match[0];
}

test("project notifications use the configured project icon and color", () => {
  const markup = renderToStaticMarkup(
    <NotificationCategoryIcon
      notification={{
        ...base,
        type: NotificationType.PROJECT_INVITATION,
        metadata: { projectIcon: "🎯", projectColor: "#22396f" },
      }}
    />,
  );
  assert.ok(markup.includes("🎯"));
  assert.match(markup, /--project-color:#22396f/);
  assert.match(markup, /rounded-full/);
  assert.doesNotMatch(markup, /<svg/);
});

for (const { metadata, Icon } of [
  {
    metadata: { documentName: "Report", mimeType: "application/pdf" },
    Icon: FaFilePdf,
  },
  { metadata: { documentName: "Report.DOCX" }, Icon: FaFileWord },
  { metadata: { documentName: "Budget.xlsx" }, Icon: FaFileExcel },
  { metadata: { documentName: "Photo.png" }, Icon: FaFileImage },
  {
    metadata: { itemType: "FOLDER", documentName: "Report.pdf" },
    Icon: FaFolder,
  },
]) {
  test(`document notifications reuse the card icon for ${metadata.documentName}`, () => {
    const markup = renderToStaticMarkup(
      <NotificationCategoryIcon notification={{ ...base, metadata }} />,
    );
    assert.equal(svg(markup), renderToStaticMarkup(<Icon size={20} />));
  });
}

test("unknown file types and missing or malformed file metadata retain the green document fallback", () => {
  const fallback = renderToStaticMarkup(<FileText className="h-5 w-5" />);
  for (const metadata of [
    undefined,
    {},
    { documentName: "Backup.unknown", mimeType: "application/octet-stream" },
    { documentName: 42, mimeType: [], itemType: {} },
  ]) {
    const markup = renderToStaticMarkup(
      <NotificationCategoryIcon notification={{ ...base, metadata }} />,
    );
    assert.equal(svg(markup), fallback);
    assert.match(markup, /bg-success-soft text-success-content/);
  }
});

test("project notifications without a configured icon retain their category fallback", () => {
  const markup = renderToStaticMarkup(
    <NotificationCategoryIcon
      notification={{
        ...base,
        type: NotificationType.PROJECT_PERMISSIONS_UPDATED,
        metadata: { projectIcon: "   " },
      }}
    />,
  );
  assert.match(markup, /lucide-folder-kanban/);
});

test("an explicit sender avatar takes precedence over a project's resource icon", () => {
  const markup = renderToStaticMarkup(
    <NotificationListRow
      notification={{
        ...base,
        type: NotificationType.PROJECT_TASK_UPDATED,
        metadata: { projectIcon: "🎯" },
      }}
      title="Task updated"
      onClick={() => undefined}
      leading={<span data-sender-avatar="true">Sender avatar</span>}
    />,
  );
  assert.match(markup, /data-sender-avatar="true"/);
  assert.ok(!markup.includes("🎯"));
});
