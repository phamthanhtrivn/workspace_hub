import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { TaskStatus } from './project.enums';
import { TaskPolicyService } from './task-policy.service';

describe('TaskPolicyService', () => {
  const findFirst = jest.fn();
  const requireCanEditTask = jest.fn();
  const service = new TaskPolicyService(
    { task: { findFirst } } as unknown as PrismaService,
    { requireCanEditTask } as unknown as ProjectAccessService,
  );

  beforeEach(() => {
    findFirst.mockReset();
    requireCanEditTask.mockReset();
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
});
