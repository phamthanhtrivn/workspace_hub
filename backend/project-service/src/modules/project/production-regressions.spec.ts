import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { TaskService } from '../task/task.service';
import { TaskCalendarEventService } from '../notification-outbox/task-calendar-event.service';
import { ActivityService } from '../activity/activity.service';
import { NotificationOutboxService } from '../notification-outbox/notification-outbox.service';
import { UpdateTaskDto } from '../task/dto/update-task.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateTaskDto } from '../task/dto/create-task.dto';
import { normalizeTaskRank } from '../task/task-rank';
import { ClientKafka } from '@nestjs/microservices';
import { TaskStatus } from './project.enums';

describe('Project production regressions', () => {
  const projectId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const access = {
    requireCanCreateTask: jest.fn(), requireCanEditTask: jest.fn(), requireCanContributeTask: jest.fn(),
    requireReadAccess: jest.fn().mockResolvedValue({ id: projectId, ownerId: userId }),
    requireWriteAccess: jest.fn().mockResolvedValue({ id: projectId, ownerId: userId }),
    getActiveMember: jest.fn(),
  } as unknown as ProjectAccessService;

  function setupTask() {
    jest.clearAllMocks();
    const current = { id: crypto.randomUUID(), projectId, createdBy: userId, title: 'A', status: 'TODO',
      parentTaskId: null, version: 0n, assignees: [] as Array<{ userId: string }>, _count: { children: 0 } };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]), $executeRaw: jest.fn().mockResolvedValue(1),
      project: { update: jest.fn().mockResolvedValue({ nextTaskNumber: 2 }) },
      task: {
        findFirst: jest.fn().mockResolvedValue(current), count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...current, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...current, ...data })),
      },
      projectMember: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
    };
    const prisma = { ...tx, $transaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaService;
    const kafka = { emit: jest.fn().mockImplementation(() => { throw new Error('Kafka offline'); }) } as unknown as ClientKafka;
    const calendar = new TaskCalendarEventService(prisma, kafka);
    const notifications = { enqueueNotification: jest.fn() } as unknown as NotificationOutboxService;
    const service = new TaskService(prisma, access, { record: jest.fn(), recordMany: jest.fn() } as unknown as ActivityService,
      notifications, calendar);
    return { current, tx, prisma, kafka, notifications, service };
  }

  it('commits task and calendar outbox together without contacting Kafka', async () => {
    const { service, tx, kafka } = setupTask();
    await expect(service.create(userId, projectId, { title: 'Saved offline' })).resolves.toMatchObject({ title: 'Saved offline' });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect((tx.$executeRaw.mock.calls[0][0] as TemplateStringsArray).join('')).toContain('notification_outbox');
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('persists an initial assignee when creating a task', async () => {
    const { service, tx, notifications } = setupTask();
    const assigneeUserId = crypto.randomUUID();

    await service.create(userId, projectId, {
      title: 'Assigned task',
      assigneeUserId,
    });

    expect(tx.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        assignees: { create: expect.objectContaining({ userId: assigneeUserId }) },
      }),
    }));
    expect(notifications.enqueueNotification).toHaveBeenCalled();
  });

  it('accepts assigneeUserId in the create-task API contract', async () => {
    const dto = plainToInstance(CreateTaskDto, { title: 'Assigned', assigneeUserId: crypto.randomUUID() });
    await expect(validate(dto, { whitelist: true, forbidNonWhitelisted: true })).resolves.toHaveLength(0);
  });

  it('uses assignee progress permission only for status and rank updates', async () => {
    const { service, current } = setupTask();
    const assigneeId = crypto.randomUUID();
    current.assignees.push({ userId: assigneeId });

    await service.update(assigneeId, current.id, {
      status: TaskStatus.IN_PROGRESS,
      rank: '2000',
    });

    expect(access.requireCanContributeTask).toHaveBeenCalledWith(
      assigneeId,
      projectId,
      userId,
      [assigneeId],
    );
    expect(access.requireCanEditTask).not.toHaveBeenCalled();

    jest.clearAllMocks();
    await service.update(assigneeId, current.id, { title: 'Renamed' });
    expect(access.requireCanEditTask).toHaveBeenCalledWith(
      assigneeId,
      projectId,
      userId,
    );
    expect(access.requireCanContributeTask).not.toHaveBeenCalled();
  });

  it('rejects a third hierarchy level when reparenting a task with children', async () => {
    const { service, tx, current } = setupTask();
    tx.task.findFirst.mockResolvedValueOnce(current).mockResolvedValueOnce({ parentTaskId: null, status: 'TODO', archived: false });
    tx.task.count.mockResolvedValue(1);
    await expect(service.update(userId, current.id, { parentTaskId: crypto.randomUUID() })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.task.update).not.toHaveBeenCalled();
  });

  it('rejects a time without offset and preserves explicit null date removal', async () => {
    const { service, tx, current } = setupTask();
    await expect(service.create(userId, projectId, { title: 'Time', startDate: '2026-09-05T09:00:00' })).rejects.toBeInstanceOf(BadRequestException);
    await service.update(userId, current.id, { startDate: null, dueDate: null });
    expect(tx.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ startDate: null, dueDate: null }) }));
  });

  it('rejects null for nonnullable update fields but accepts null dates/assignee', async () => {
    for (const dto of [plainToInstance(UpdateTaskDto, { title: null }), plainToInstance(UpdateProjectDto, { name: null })]) {
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
    expect(await validate(plainToInstance(UpdateTaskDto, { startDate: null, dueDate: null, assigneeUserId: null }))).toEqual([]);
  });

  it('keeps numeric task ranks ordered beyond ten tasks', () => {
    const ranks = Array.from({ length: 12 }, (_, i) => normalizeTaskRank(String((i + 1) * 1000))!);
    expect([...ranks].sort()).toEqual(ranks);
  });
});
