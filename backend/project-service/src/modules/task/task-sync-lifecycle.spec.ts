import { PrismaService } from "../../common/prisma/prisma.service";
import { ProjectAccessService } from "../project/project-access.service";
import { ProjectSpaceClient } from "../project/project-space.client";
import { ActivityService } from "../activity/activity.service";
import { NotificationOutboxService } from "../notification-outbox/notification-outbox.service";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import { TaskDocumentClient } from "./task-document.client";
import { TaskSyncOutboxService } from "../task-sync/task-sync-outbox.service";
import { TaskService } from "./task.service";
import { TaskPriority } from "../project/project.enums";
jest.mock("../project/project.mapper", () => ({
  toTaskResponse: (task: unknown) => task,
}));

function fixture() {
  const task = {
    id: "task",
    projectId: "project",
    title: "Task",
    status: "TODO",
    priority: "LOW",
    dueDate: null,
    startDate: null,
    deletedAt: null,
    version: 1n,
    assignees: [],
    createdBy: "owner",
    reporterId: null,
  };
  const tx = {
    $queryRaw: jest.fn(),
    project: { update: jest.fn().mockResolvedValue({ nextTaskNumber: 2 }) },
    task: {
      create: jest.fn().mockResolvedValue(task),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
      update: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
          ...task,
          ...data,
          version: 2n,
        })),
    },
  };
  const prisma = {
    task: { findFirst: jest.fn().mockResolvedValue(task) },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (db: typeof tx) => unknown) => fn(tx)),
  };
  const sync = { enqueue: jest.fn() };
  const service = new TaskService(
    prisma as unknown as PrismaService,
    {
      requireCanCreateTask: jest.fn(),
      requireCanEditTask: jest.fn(),
    } as unknown as ProjectAccessService,
    { record: jest.fn(), recordMany: jest.fn() } as unknown as ActivityService,
    {} as NotificationOutboxService,
    {
      getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as UserProfileSnapshotService,
    {} as TaskDocumentClient,
    {} as ProjectSpaceClient,
    sync as unknown as TaskSyncOutboxService,
  );
  return { service, sync, tx };
}
describe("task lifecycle synchronization", () => {
  it("queues task creation inside its transaction", async () => {
    const { service, sync, tx } = fixture();
    await service.create("owner", "project", { title: "Task" });
    expect(sync.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ id: "task" }),
      tx,
    );
  });
  it("queues priority-only updates even when the task has no assignee", async () => {
    const { service, sync, tx } = fixture();
    await service.update("owner", "task", { priority: TaskPriority.URGENT });
    expect(sync.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "URGENT", version: 2n }),
      tx,
    );
  });
  it("queues soft deletion in the same transaction while keeping the task identity", async () => {
    const { service, sync, tx } = fixture();
    await service.delete("owner", "task");
    expect(sync.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "task",
        deletedAt: expect.any(Date),
        version: 2n,
      }),
      tx,
    );
  });
  it("rejects the task write if its sync event cannot be recorded", async () => {
    const { service, sync } = fixture();
    sync.enqueue.mockRejectedValue(new Error("outbox write failed"));
    await expect(
      service.update("owner", "task", { title: "New title" }),
    ).rejects.toThrow("outbox write failed");
  });
});
