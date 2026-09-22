import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskPriority, TaskStatus } from "../types/project";
import { getProjectTaskStatusCounts, getProjectTasks } from "./task.api";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  api: {
    get: mocks.get,
  },
}));

const taskApiModel = {
  id: "task-1",
  projectId: "project-1",
  taskNumber: 1,
  title: "Build API filters",
  priority: TaskPriority.HIGH,
  status: TaskStatus.IN_PROGRESS,
  createdBy: "user-1",
  reporterId: "user-1",
  allDay: false,
  estimatedMinutes: 30,
  archived: false,
};

describe("task api", () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it("passes task filter params while fetching every page", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: "ok",
          data: [taskApiModel],
          meta: { page: 1, limit: 100, total: 2, totalPages: 2, hasNext: true },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: "ok",
          data: [{ ...taskApiModel, id: "task-2", taskNumber: 2 }],
          meta: { page: 2, limit: 100, total: 2, totalPages: 2, hasNext: false },
        },
      });

    const tasks = await getProjectTasks("project-1", {
      search: "api",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assigneeUserIds: "user-1,user-2",
      onlyMine: true,
    });

    expect(tasks).toHaveLength(2);
    expect(mocks.get).toHaveBeenNthCalledWith(
      1,
      "/api/projects/project-1/tasks",
      {
        params: {
          page: 1,
          limit: 100,
          search: "api",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          assigneeUserIds: "user-1,user-2",
          onlyMine: true,
        },
      },
    );
    expect(mocks.get).toHaveBeenNthCalledWith(
      2,
      "/api/projects/project-1/tasks",
      {
        params: {
          page: 2,
          limit: 100,
          search: "api",
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          assigneeUserIds: "user-1,user-2",
          onlyMine: true,
        },
      },
    );
  });

  it("loads overall project task status counts", async () => {
    const counts = {
      [TaskStatus.TODO]: 1,
      [TaskStatus.IN_PROGRESS]: 2,
      [TaskStatus.IN_REVIEW]: 3,
      [TaskStatus.DONE]: 4,
      [TaskStatus.CANCELLED]: 5,
    };
    mocks.get.mockResolvedValueOnce({
      data: { success: true, message: "ok", data: counts },
    });

    await expect(getProjectTaskStatusCounts("project-1")).resolves.toEqual(
      counts,
    );
    expect(mocks.get).toHaveBeenCalledWith(
      "/api/projects/project-1/tasks/status-counts",
    );
  });
});
