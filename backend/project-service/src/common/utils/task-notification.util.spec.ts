import { test } from "node:test";
import assert from "node:assert/strict";
import { KAFKA_EVENTS } from "../constants/kafka.constants";
import {
  buildTaskNotification,
  taskNotificationContent,
} from "./task-notification.util";

const project = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Workspace",
  icon: "🎯",
  color: "#22396f",
};
const task = {
  id: "00000000-0000-4000-8000-000000000002",
  title: "Review design",
  taskNumber: 17,
};

test("task notifications retain project/task context and link to the task drawer", () => {
  for (const type of [
    KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED,
    KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED,
  ]) {
    const notification = buildTaskNotification({
      type,
      project,
      task,
      senderId: "actor",
      recipientId: "assignee",
    });
    assert.equal(
      notification.link,
      `/projects/${project.id}?taskId=${task.id}`,
    );
    assert.deepEqual(notification.metadata, {
      projectId: project.id,
      projectName: project.name,
      projectIcon: project.icon,
      projectColor: project.color,
      taskId: task.id,
      taskTitle: task.title,
      taskNumber: task.taskNumber,
    });
    assert.match(notification.content, /TASK-17/);
    assert.match(notification.content, /Workspace/);
    assert.equal(notification.senderId, "actor");
    assert.equal(notification.recipientId, "assignee");
  }
});

test("sender enrichment formats the correct action without rewriting legacy content", () => {
  const metadata = {
    projectName: project.name,
    taskTitle: task.title,
    taskNumber: 17,
  };
  assert.equal(
    taskNotificationContent(
      KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED,
      metadata,
      "Alex",
    ),
    'Alex assigned TASK-17 "Review design" to you in project "Workspace".',
  );
  assert.equal(
    taskNotificationContent(
      KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED,
      metadata,
      "Alex",
    ),
    'Alex updated TASK-17 "Review design" in project "Workspace".',
  );
  assert.equal(
    taskNotificationContent(
      KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED,
      { taskId: task.id, projectId: project.id },
      "Alex",
    ),
    undefined,
  );
});
