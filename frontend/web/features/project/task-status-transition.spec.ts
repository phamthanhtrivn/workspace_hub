import assert from "node:assert/strict";
import { test } from "node:test";
import { canMoveTaskToStatus, getOpenTaskSubtasks, getTaskStatusTransitionReason } from "./task-status-transition";
import { TaskStatus, type Task } from "./types/project";

const task = (status: TaskStatus, extra: Partial<Task> = {}) => ({ id: "parent", status, ...extra }) as Task;
const allowed: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.DONE, TaskStatus.CANCELLED],
  [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.CANCELLED],
  [TaskStatus.DONE]: [],
  [TaskStatus.CANCELLED]: [],
};

test("every status pair follows backend rules, including the review-to-progress exception", () => {
  for (const current of Object.values(TaskStatus)) {
    for (const next of Object.values(TaskStatus)) {
      assert.equal(canMoveTaskToStatus(task(current), next), allowed[current].includes(next), `${current} -> ${next}`);
    }
  }
});

test("unavailable transitions explain current, backwards, closed and archived states", () => {
  assert.match(getTaskStatusTransitionReason(task(TaskStatus.TODO), TaskStatus.TODO)!, /current status/i);
  assert.match(getTaskStatusTransitionReason(task(TaskStatus.IN_PROGRESS), TaskStatus.TODO)!, /backwards/i);
  assert.match(getTaskStatusTransitionReason(task(TaskStatus.DONE), TaskStatus.IN_REVIEW)!, /read-only/i);
  assert.match(getTaskStatusTransitionReason(task(TaskStatus.TODO, { archived: true }), TaskStatus.DONE)!, /archived/i);
});

test("only active unfinished children block Done; cancellation and forward moves remain available", () => {
  const parent = task(TaskStatus.IN_PROGRESS);
  const child = task(TaskStatus.TODO, { id: "child", parentTaskId: parent.id });
  assert.match(getTaskStatusTransitionReason(parent, TaskStatus.DONE, [child])!, /subtasks/i);
  assert.equal(canMoveTaskToStatus(parent, TaskStatus.DONE, [child]), false);
  assert.equal(canMoveTaskToStatus(parent, TaskStatus.IN_REVIEW, [child]), true);
  assert.equal(canMoveTaskToStatus(parent, TaskStatus.CANCELLED, [child]), true);
  for (const finishedChild of [
    { ...child, status: TaskStatus.DONE },
    { ...child, status: TaskStatus.CANCELLED },
    { ...child, archived: true },
    { ...child, deletedAt: new Date().toISOString() },
    { ...child, parentTaskId: "another-parent" },
  ]) {
    assert.equal(getOpenTaskSubtasks(parent.id, [finishedChild]).length, 0);
    assert.equal(canMoveTaskToStatus(parent, TaskStatus.DONE, [finishedChild]), true);
  }
});
