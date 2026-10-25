import { KafkaRetriableException } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { SocketEventEmitter } from '../socket/services/socket-event-emitter';
import { TaskSyncService } from './task-sync.service';
import { TaskSyncConsumer } from './task-sync.consumer';
import { TaskSyncEventDto } from './task-sync.dto';

const event: TaskSyncEventDto = {
  schemaVersion: 1,
  taskId: '68a94ab7-b2fe-48f3-bedd-82e926b79219',
  projectId: '7df44b14-7438-42e4-8249-13eaa01addd1',
  version: '3',
  title: 'Updated task',
  status: 'IN_REVIEW',
  priority: 'HIGH',
  dueDate: null,
  deleted: false,
};
function fixture() {
  const makeMessage = (id: string, content: string) => ({
    id,
    channelId: id === 'legacy' ? 'private' : 'public',
    content,
    type: 'TEXT',
    updatedAt: new Date(),
  });
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    projectTaskSnapshot: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    message: {
      findMany: jest.fn().mockResolvedValue([
        makeMessage(
          'json',
          JSON.stringify({
            type: 'TASK',
            taskId: event.taskId,
            title: 'Old task',
            dueDate: '2026-10-20',
          }),
        ),
        makeMessage('legacy', 'Discussion Thread: Old task [Task #68a94ab7]'),
        makeMessage(
          'unrelated',
          'Discussion mentioning task id only ' + event.taskId,
        ),
      ]),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: { content: string; type: string };
        }) => ({ ...makeMessage(where.id, data.content), type: data.type }),
      ),
    },
  };
  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (db: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    channelMember: {
      findMany: jest.fn().mockResolvedValue([{ userId: 'current-member' }]),
    },
  };
  const sockets = { emitToRooms: jest.fn() };
  const service = new TaskSyncService(
    prisma as unknown as PrismaService,
    sockets as unknown as SocketEventEmitter,
  );
  return { tx, prisma, sockets, service };
}
describe('project task card synchronization', () => {
  it('updates all matching cards, clears removed dates, preserves unrelated discussion and scopes private recipients', async () => {
    const { service, tx, sockets } = fixture();
    await service.apply(event);
    expect(tx.message.update).toHaveBeenCalledTimes(2);
    expect((tx.message.findMany.mock.calls as unknown[][])[0][0]).toMatchObject(
      {
        where: {
          channel: { space: { projectId: event.projectId } },
        },
      },
    );
    const content = JSON.parse(
      tx.message.update.mock.calls[0][0].data.content,
    ) as Record<string, unknown>;
    expect(content).toMatchObject({
      title: event.title,
      status: 'IN_REVIEW',
      priority: 'HIGH',
      dueDate: null,
      taskVersion: '3',
    });
    expect(sockets.emitToRooms).toHaveBeenCalledTimes(2);
    expect(sockets.emitToRooms).toHaveBeenNthCalledWith(
      1,
      ['current-member'],
      expect.any(String),
      expect.any(Object),
    );
    expect(sockets.emitToRooms).toHaveBeenNthCalledWith(
      2,
      ['current-member'],
      expect.any(String),
      expect.any(Object),
    );
  });
  it('ignores older Kafka versions and events for a different project', async () => {
    for (const snapshot of [
      { projectId: event.projectId, version: 4n },
      { projectId: 'other', version: 1n },
    ]) {
      const { service, tx, sockets } = fixture();
      tx.projectTaskSnapshot.findUnique.mockResolvedValue(snapshot);
      await service.apply(event);
      expect(tx.message.update).not.toHaveBeenCalled();
      expect(sockets.emitToRooms).not.toHaveBeenCalled();
    }
  });
  it('retains history when deleted and republishes duplicate events to recover delivery', async () => {
    const { service, tx, sockets } = fixture();
    tx.projectTaskSnapshot.findUnique.mockResolvedValue({
      projectId: event.projectId,
      version: 3n,
    });
    await service.apply({ ...event, deleted: true });
    expect(
      JSON.parse(tx.message.update.mock.calls[0][0].data.content),
    ).toMatchObject({ deleted: true, taskId: event.taskId });
    expect(sockets.emitToRooms).toHaveBeenCalledTimes(2);
  });
  it('does not publish after the transaction fails', async () => {
    const { service, tx, sockets } = fixture();
    tx.message.update.mockRejectedValue(new Error('rollback'));
    await expect(service.apply(event)).rejects.toThrow('rollback');
    expect(sockets.emitToRooms).not.toHaveBeenCalled();
  });
  it('validates incoming contracts and retries persistence failures', async () => {
    const tasks = { apply: jest.fn() };
    const consumer = new TaskSyncConsumer(tasks as unknown as TaskSyncService);
    await consumer.handle({ ...event, taskId: 'bad-id' });
    await consumer.handle({ ...event, version: '-1' });
    await consumer.handle({ ...event, version: '9999999999999999999' });
    expect(tasks.apply).not.toHaveBeenCalled();
    tasks.apply.mockRejectedValue(new Error('database unavailable'));
    await expect(consumer.handle(event)).rejects.toBeInstanceOf(
      KafkaRetriableException,
    );
  });
});
