import { TaskService } from './task.service';
import { TaskStatus } from '../project/project.enums';

describe('TaskService relation rules', () => {
  function createService() {
    return new TaskService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  it('rejects completing a parent task while active subtasks are not done', async () => {
    const service = createService();
    const database = {
      task: {
        count: jest.fn().mockResolvedValue(1),
      },
    };

    await expect(
      (service as any).assertCanCompleteTaskWithSubtasks('task-1', database),
    ).rejects.toThrow('Complete all subtasks before marking this task as done.');
  });

  it('allows completing a parent task after all active subtasks are done', async () => {
    const service = createService();
    const database = {
      task: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    await expect(
      (service as any).assertCanCompleteTaskWithSubtasks('task-1', database),
    ).resolves.toBeUndefined();
  });

  it('rejects assigning a parent when a direct dependency already exists', async () => {
    const service = createService();
    const database = {
      task: {
        findFirst: jest.fn().mockResolvedValue({
          archived: false,
          parentTaskId: null,
          status: TaskStatus.TODO,
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      taskDependency: {
        count: jest.fn().mockResolvedValue(1),
      },
    };

    await expect(
      (service as any).validateParent(
        'project-1',
        'parent-task-1',
        'task-1',
        database,
      ),
    ).rejects.toThrow('A task cannot depend on its parent or subtask.');
  });
});
