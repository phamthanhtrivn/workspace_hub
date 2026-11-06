import { test } from "node:test";
import assert from "node:assert/strict";
import { NotificationType, type Notification } from "../types/notification.types";
import { getProjectTaskNotificationLink, getProjectTaskNotificationMetadata, projectTaskNotificationDescription, projectTaskNotificationHeading } from "./project-task-notification.utils";

const projectId = "00000000-0000-4000-8000-000000000001";
const taskId = "00000000-0000-4000-8000-000000000002";
const notification: Notification = {
  id: "notification", recipientId: "assignee", senderId: "actor",
  type: NotificationType.PROJECT_TASK_ASSIGNED, title: "You were assigned a task",
  content: 'Task "Review" was assigned to you.', isRead: false,
  createdAt: "2026-11-06T00:00:00Z", updatedAt: "2026-11-06T00:00:00Z",
  metadata: { projectId, taskId },
};

test("legacy task metadata opens the exact drawer without trusting notification.link", () => {
  for (const type of [NotificationType.PROJECT_TASK_ASSIGNED, NotificationType.PROJECT_TASK_UPDATED]) {
    assert.equal(getProjectTaskNotificationLink({ ...notification, type, link: "javascript:alert(1)" }),
      `/projects/${projectId}?taskId=${taskId}`);
  }
});

test("new metadata includes readable task/project details", () => {
  assert.deepEqual(getProjectTaskNotificationMetadata({ ...notification,
    metadata: { projectId, taskId, projectName: " Workspace ", taskTitle: " Review ", taskNumber: 17 },
  }), { projectId, taskId, projectName: "Workspace", taskTitle: "Review", taskNumber: 17 });
  assert.equal(projectTaskNotificationDescription(notification, "Review", 17), "TASK-17 · Review");
});

test("missing or inaccessible context preserves the saved notification content", () => {
  assert.equal(projectTaskNotificationDescription(notification), notification.content);
  assert.equal(projectTaskNotificationHeading(notification, "Alex"), "Alex assigned a task to you");
  assert.equal(projectTaskNotificationHeading({ ...notification, type: NotificationType.PROJECT_TASK_UPDATED }, "Alex"),
    "Alex updated a task");
});

test("other notification types and malformed metadata cannot navigate to a task", () => {
  assert.equal(getProjectTaskNotificationLink({ ...notification, type: NotificationType.PROJECT_INVITATION }), undefined);
  for (const metadata of [undefined, {}, { projectId, taskId: "../other" },
    { projectId: "https://attacker.invalid", taskId }, { projectId: {}, taskId }]) {
    assert.equal(getProjectTaskNotificationLink({ ...notification, metadata }), undefined);
  }
});

test("invalid optional task fields are ignored without losing valid legacy IDs", () => {
  assert.deepEqual(getProjectTaskNotificationMetadata({ ...notification,
    metadata: { projectId, taskId, projectName: 123, taskTitle: {}, taskNumber: -1 },
  }), { projectId, taskId, projectName: undefined, taskTitle: undefined, taskNumber: undefined });
});
