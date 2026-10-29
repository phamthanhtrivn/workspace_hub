import { randomUUID } from 'node:crypto';
import { TaskService } from './task.service';
import { ActivityService } from '../activity/activity.service';
import { ProjectAccessService } from '../project/project-access.service';
import { TaskSyncOutboxService } from '../task-sync/task-sync-outbox.service';

const integration = process.env.TEST_UX_POSTGRES === 'true' ? describe : describe.skip;
integration('Task reopening transactions (isolated PostgreSQL)', () => {
  let prisma: any, cleanup: () => Promise<void>, service: TaskService, taskId: string;
  const userId = randomUUID(), projectId = randomUUID();
  beforeAll(async () => {
    ({ prisma, cleanup } = await require('../../../../scripts/isolated-postgres.cjs').isolatedPostgres(process.cwd()));
    const profiles = { getProfilesByUserIds: async () => new Map() } as any;
    service = new TaskService(prisma, new ProjectAccessService(prisma), new ActivityService(prisma, {} as any, profiles), {} as any, profiles, {} as any, {} as any, new TaskSyncOutboxService(prisma, {} as any, {} as any));
    await prisma.project.create({ data: { id: projectId, name: 'Reopen fixture', ownerId: userId, status: 'ACTIVE', createdAt: new Date() } });
    const task = await prisma.task.create({ data: { projectId, taskNumber: 1, title: 'Closed task', priority: 'MEDIUM', status: 'DONE', createdBy: userId, reporterId: userId, createdAt: new Date(), completedAt: new Date(), completedBy: userId } });
    taskId = task.id;
  }, 60_000);
  afterAll(async () => { await cleanup?.(); });
  it('two simultaneous requests create one version, one activity and one outbox record', async () => {
    const tasks = await Promise.all([service.reopen(userId, taskId), service.reopen(userId, taskId)]);
    expect(tasks.every(task => task.status === 'TODO')).toBe(true);
    expect((await prisma.task.findUnique({ where: { id: taskId } })).version).toBe(1n);
    expect(await prisma.taskActivity.count({ where: { taskId } })).toBe(1);
    expect(await prisma.taskSyncOutbox.count({ where: { taskId } })).toBe(1);
  }, 30_000);
});
