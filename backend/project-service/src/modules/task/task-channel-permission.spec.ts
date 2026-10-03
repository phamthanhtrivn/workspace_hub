import { TaskService } from './task.service';

describe('TaskService channel permission', () => {
  function createService() {
    const prisma = { $transaction: jest.fn().mockRejectedValue(new Error('transaction reached')) };
    const access = { requireCanCreateTask: jest.fn().mockResolvedValue({}) };
    const projectSpace = { assertCanCreateTaskInChannel: jest.fn().mockResolvedValue(undefined) };
    const service = new TaskService(
      prisma as any,
      access as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      projectSpace as any,
    );
    return { service, prisma, access, projectSpace };
  }

  it('checks channel permission before writing a task', async () => {
    const { service, prisma, access, projectSpace } = createService();
    projectSpace.assertCanCreateTaskInChannel.mockRejectedValue(new Error('permission denied'));

    await expect(service.create('user-1', 'project-1', {
      title: 'Task', channelId: 'channel-1',
    })).rejects.toThrow('permission denied');
    expect(access.requireCanCreateTask).toHaveBeenCalledWith('user-1', 'project-1');
    expect(projectSpace.assertCanCreateTaskInChannel).toHaveBeenCalledWith(
      'project-1', 'channel-1', 'user-1',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('leaves project-page task creation independent of channel permission', async () => {
    const { service, prisma, projectSpace } = createService();
    await expect(service.create('user-1', 'project-1', { title: 'Task' }))
      .rejects.toThrow('transaction reached');
    expect(projectSpace.assertCanCreateTaskInChannel).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
