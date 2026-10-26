import { of, throwError } from "rxjs";
import { ClientKafka } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RuntimeConfigService } from "../../common/config/runtime-config.service";
import { TaskSyncOutboxService } from "./task-sync-outbox.service";
import { KAFKA_TOPICS } from "../../common/constants/kafka.constants";

const task = {
  id: "task",
  projectId: "project",
  version: 3n,
  title: "Review",
  status: "TODO",
  priority: "HIGH",
  dueDate: null,
  deletedAt: null,
};
function fixture() {
  const prisma = {
    task: {
      findMany: jest.fn().mockResolvedValueOnce([task]).mockResolvedValue([]),
    },
    taskSyncOutbox: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: "event",
            taskId: task.id,
            payload: { version: "3" },
            attemptCount: 0,
          },
        ]),
      update: jest.fn(),
      createMany: jest.fn(),
    },
  };
  const kafka = { emit: jest.fn().mockReturnValue(of(undefined)) };
  const service = new TaskSyncOutboxService(
    prisma as unknown as PrismaService,
    kafka as unknown as ClientKafka,
    { outboxPollIntervalMs: 1000, outboxBatchSize: 20 } as RuntimeConfigService,
  );
  return { service, prisma, kafka };
}
describe("transactional task sync outbox", () => {
  it("records the complete card snapshot inside the caller transaction without sending Kafka", async () => {
    const { service, kafka } = fixture();
    const tx = { taskSyncOutbox: { upsert: jest.fn() } };
    await service.enqueue(task, tx as unknown as Prisma.TransactionClient);
    expect(tx.taskSyncOutbox.upsert.mock.calls[0][0].create.payload).toEqual({
      schemaVersion: 1,
      taskId: "task",
      projectId: "project",
      version: "3",
      title: "Review",
      status: "TODO",
      priority: "HIGH",
      dueDate: null,
      deleted: false,
    });
    expect(kafka.emit).not.toHaveBeenCalled();
  });
  it("publishes keyed Kafka events and marks only acknowledged sends delivered", async () => {
    const { service, kafka, prisma } = fixture();
    await service.drain();
    expect(kafka.emit).toHaveBeenCalledWith(KAFKA_TOPICS.PROJECT_TASK_SYNC, {
      key: task.id,
      value: { version: "3" },
    });
    expect(
      prisma.taskSyncOutbox.update.mock.calls[0][0].data.deliveredAt,
    ).toBeInstanceOf(Date);
  });
  it("keeps failed sends pending for retry instead of dropping updates", async () => {
    const { service, kafka, prisma } = fixture();
    kafka.emit.mockReturnValue(throwError(() => new Error("broker down")));
    await service.drain();
    expect(prisma.taskSyncOutbox.update.mock.calls[0][0].data).toMatchObject({
      attemptCount: { increment: 1 },
      nextAttemptAt: expect.any(Date),
    });
    expect(
      prisma.taskSyncOutbox.update.mock.calls[0][0].data.deliveredAt,
    ).toBeUndefined();
  });
  it("reconciles pre-existing tasks in batches without duplicating versions", async () => {
    const { service, prisma } = fixture();
    await service.reconcileExistingTasks();
    expect(prisma.taskSyncOutbox.createMany.mock.calls[0][0]).toMatchObject({
      skipDuplicates: true,
      data: [{ taskId: task.id, version: 3n }],
    });
  });
});
