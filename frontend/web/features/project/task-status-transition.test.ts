import { describe, expect, it } from "vitest";
import { canMoveTaskToStatus } from "./task-status-transition";
import { TaskStatus, type Task } from "./types/project";

function taskWithStatus(status: TaskStatus): Task {
  return { status } as Task;
}

describe("canMoveTaskToStatus", () => {
  it("allows a review task to return to in progress", () => {
    expect(
      canMoveTaskToStatus(
        taskWithStatus(TaskStatus.IN_REVIEW),
        TaskStatus.IN_PROGRESS,
      ),
    ).toBe(true);
  });

  it("does not allow a review task to return directly to todo", () => {
    expect(
      canMoveTaskToStatus(
        taskWithStatus(TaskStatus.IN_REVIEW),
        TaskStatus.TODO,
      ),
    ).toBe(false);
  });
});
