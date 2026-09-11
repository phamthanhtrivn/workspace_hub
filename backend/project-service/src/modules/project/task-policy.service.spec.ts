import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { TaskStatus } from './project.enums';
import { TaskPolicyService } from './task-policy.service';

describe('TaskPolicyService', () => {
  const findFirst = jest.fn();
  const requireCanEditTask = jest.fn();
  const requireCanContributeTask = jest.fn();
  const service = new TaskPolicyService(
    { task: { findFirst } } as unknown as PrismaService,
    {
      requireCanEditTask,
      requireCanContributeTask,
    } as unknown as ProjectAccessService,
  );

  beforeEach(() => {
    findFirst.mockReset();
    requireCanEditTask.mockReset();
    requireCanContributeTask.mockReset();
  });

  it('checks project permission before returning an editable task', async () => {
    findFirst.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      createdBy: 'creator-1',
      status: TaskStatus.IN_PROGRESS,
    });

    await expect(service.requireEditable('user-1', 'task-1')).resolves.toMatchObject({ id: 'task-1' });
    expect(requireCanEditTask).toHaveBeenCalledWith('user-1', 'project-1', 'creator-1');
  });

  it('rejects terminal tasks after permission is verified', async () => {
    findFirst.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      createdBy: 'creator-1',
      status: TaskStatus.DONE,
    });

    await expect(service.requireEditable('user-1', 'task-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses assignee-aware permission for task collaboration', async () => {
    findFirst.mockResolvedValue({
      id: 'task-1',
      projectId: 'project-1',
      createdBy: 'creator-1',
      status: TaskStatus.IN_PROGRESS,
      assignees: [{ userId: 'user-1' }],
    });

    await expect(
      service.requireContributable('user-1', 'task-1'),
    ).resolves.toMatchObject({ id: 'task-1' });
    expect(requireCanContributeTask).toHaveBeenCalledWith(
      'user-1',
      'project-1',
      'creator-1',
      ['user-1'],
    );
  });
});
