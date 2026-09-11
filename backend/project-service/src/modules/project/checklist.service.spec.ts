import { PrismaService } from '../../common/prisma/prisma.service';
import { ActivityService } from './activity.service';
import { ChecklistService } from './checklist.service';
import { TaskPolicyService } from './task-policy.service';

describe('ChecklistService task collaboration', () => {
  it('uses assignee-aware permission for create, update, and delete', async () => {
    const taskId = crypto.randomUUID();
    const checklistId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const item = {
      id: checklistId,
      taskId,
      title: 'Verify API',
      completed: false,
    };
    const transaction = {
      taskChecklist: {
        create: jest.fn().mockResolvedValue(item),
        update: jest.fn().mockResolvedValue({ ...item, completed: true }),
        delete: jest.fn().mockResolvedValue(item),
      },
    };
    const prisma = {
      taskChecklist: { findUnique: jest.fn().mockResolvedValue(item) },
      $transaction: jest.fn(async (operation) => operation(transaction)),
    } as unknown as PrismaService;
    const activities = { record: jest.fn() } as unknown as ActivityService;
    const requireContributable = jest.fn();
    const taskPolicy = {
      requireContributable,
    } as unknown as TaskPolicyService;
    const service = new ChecklistService(prisma, activities, taskPolicy);

    await service.create(userId, taskId, { title: item.title });
    await service.update(userId, checklistId, { completed: true });
    await service.remove(userId, checklistId);

    expect(requireContributable).toHaveBeenNthCalledWith(1, userId, taskId);
    expect(requireContributable).toHaveBeenNthCalledWith(2, userId, taskId);
    expect(requireContributable).toHaveBeenNthCalledWith(3, userId, taskId);
  });
});
