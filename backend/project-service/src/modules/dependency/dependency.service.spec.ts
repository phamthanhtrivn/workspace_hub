import { DependencyService } from './dependency.service';
import { DependencyType } from './dto/create-dependency.dto';
import { TaskStatus } from '../project/project.enums';

describe('DependencyService', () => {
  const userId = 'user-1';
  const projectId = 'project-1';
  const successorTaskId = 'successor-1';
  const predecessorTaskId = 'predecessor-1';

  function createService() {
    const prisma = {
      task: {
        findFirst: jest.fn(),
      },
      taskDependency: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const access = {
      requireCanEditTask: jest.fn().mockResolvedValue(undefined),
    };
    return {
      service: new DependencyService(prisma as any, access as any),
      prisma,
      access,
    };
  }

  function editableSuccessor(overrides: Record<string, unknown> = {}) {
    return {
      id: successorTaskId,
      projectId,
      createdBy: userId,
      status: TaskStatus.IN_PROGRESS,
      archived: false,
      parentTaskId: null,
      ...overrides,
    };
  }

  function predecessor(overrides: Record<string, unknown> = {}) {
    return {
      id: predecessorTaskId,
      projectId,
      status: TaskStatus.TODO,
      archived: false,
      parentTaskId: null,
      ...overrides,
    };
  }

  it('allows dependencies with a completed predecessor', async () => {
    const { service, prisma } = createService();
    prisma.task.findFirst
      .mockResolvedValueOnce(editableSuccessor())
      .mockResolvedValueOnce(predecessor({ status: TaskStatus.DONE }));
    prisma.taskDependency.findMany.mockResolvedValue([]);
    prisma.taskDependency.upsert.mockResolvedValue({ id: 'dependency-1' });

    await expect(
      service.create(userId, successorTaskId, {
        predecessorTaskId,
        dependencyType: DependencyType.FINISH_TO_START,
      }),
    ).resolves.toEqual({ id: 'dependency-1' });
  });

  it('rejects dependency changes on closed successor tasks', async () => {
    const { service, prisma } = createService();
    prisma.task.findFirst.mockResolvedValueOnce(
      editableSuccessor({ status: TaskStatus.DONE }),
    );

    await expect(
      service.create(userId, successorTaskId, {
        predecessorTaskId,
        dependencyType: DependencyType.FINISH_TO_START,
      }),
    ).rejects.toThrow('Closed tasks cannot change dependencies.');
  });

  it('rejects parent and subtask dependencies in either direction', async () => {
    const { service, prisma } = createService();
    prisma.task.findFirst
      .mockResolvedValueOnce(editableSuccessor({ parentTaskId: predecessorTaskId }))
      .mockResolvedValueOnce(predecessor());

    await expect(
      service.create(userId, successorTaskId, {
        predecessorTaskId,
        dependencyType: DependencyType.FINISH_TO_START,
      }),
    ).rejects.toThrow('A task cannot depend on its parent or subtask.');

    prisma.task.findFirst.mockReset();
    prisma.task.findFirst
      .mockResolvedValueOnce(editableSuccessor())
      .mockResolvedValueOnce(predecessor({ parentTaskId: successorTaskId }));

    await expect(
      service.create(userId, successorTaskId, {
        predecessorTaskId,
        dependencyType: DependencyType.FINISH_TO_START,
      }),
    ).rejects.toThrow('A task cannot depend on its parent or subtask.');
  });

  it('rejects dependency cycles', async () => {
    const { service, prisma } = createService();
    prisma.task.findFirst
      .mockResolvedValueOnce(editableSuccessor())
      .mockResolvedValueOnce(predecessor());
    prisma.taskDependency.findMany.mockResolvedValue([
      {
        predecessorTaskId: successorTaskId,
        successorTaskId: predecessorTaskId,
      },
    ]);

    await expect(
      service.create(userId, successorTaskId, {
        predecessorTaskId,
        dependencyType: DependencyType.FINISH_TO_START,
      }),
    ).rejects.toThrow('This dependency would create a cycle');
  });
});
