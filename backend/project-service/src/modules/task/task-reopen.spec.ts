import { TaskService } from './task.service';
import { ProjectAccessService } from '../project/project-access.service';

describe('Task reopening', () => {
  function setup(parentStatus = 'TODO') {
    const task = { id: 'task', projectId: 'project', parentTaskId: 'parent', status: 'DONE', archived: false, deletedAt: null,
      createdBy: 'creator', reporterId: 'creator', version: 4n, assignees: [], checklists: [], documentAttachments: [], labelMappings: [] };
    const tx = { $queryRaw: jest.fn(), $executeRaw: jest.fn(), task: {
      findFirst: jest.fn().mockResolvedValue(task), findUnique: jest.fn().mockResolvedValue({ status: parentStatus }),
      update: jest.fn().mockImplementation(({ data }) => ({ ...task, ...data })),
    } };
    const access = { requireCanEditTask: jest.fn().mockResolvedValue({}) };
    const activity = { record: jest.fn() }, sync = { enqueue: jest.fn() };
    const prisma = { task: tx.task, $transaction: jest.fn(callback => callback(tx)) };
    const profiles = { getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()) };
    const service = new TaskService(prisma as any, access as unknown as ProjectAccessService, activity as any, {} as any, profiles as any, {} as any, {} as any, sync as any);
    return { service, tx, access, activity, sync, task };
  }
  it('returns to TODO, clears completion and emits durable changes', async () => {
    const { service, tx, activity, sync } = setup();
    await service.reopen('creator', 'task');
    expect(tx.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'TODO', completedAt: null, completedBy: null }) }));
    expect(activity.record).toHaveBeenCalled(); expect(sync.enqueue).toHaveBeenCalled();
  });
  it.each(['DONE', 'CANCELLED'])('requires opening the %s parent first', async parentStatus => {
    const { service, tx } = setup(parentStatus);
    await expect(service.reopen('creator', 'task')).rejects.toThrow('Reopen the parent task');
    expect(tx.task.update).not.toHaveBeenCalled();
  });
  it('rejects users who lack edit permissions', async () => {
    const { service, tx, access } = setup(); access.requireCanEditTask.mockRejectedValue(new Error('Forbidden'));
    await expect(service.reopen('outsider', 'task')).rejects.toThrow('Forbidden');
    expect(tx.task.update).not.toHaveBeenCalled();
  });
  it('does not reopen archived tasks', async () => {
    const { service, task, tx } = setup(); task.archived = true;
    await expect(service.reopen('creator', 'task')).rejects.toThrow('Archived');
    expect(tx.task.update).not.toHaveBeenCalled();
  });
});
