import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { TaskService } from './task.service';
import { SprintService } from './sprint.service';
import { TaskCalendarEventService } from './task-calendar-event.service';
import { ActivityService } from './activity.service';
import { NotificationOutboxService } from './notification-outbox.service';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { normalizeTaskRank } from './task-rank';
import { ProjectFileService } from './project-file.service';
import { ClientKafka } from '@nestjs/microservices';

describe('Project production regressions', () => {
  const projectId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const access = {
    requireCanCreateTask: jest.fn(), requireCanManageSprints: jest.fn(), requireCanEditTask: jest.fn(),
    requireReadAccess: jest.fn().mockResolvedValue({ id: projectId, ownerId: userId }), getActiveMember: jest.fn(),
  } as unknown as ProjectAccessService;

  function setupTask() {
    const current = { id: crypto.randomUUID(), projectId, createdBy: userId, title: 'A', status: 'TODO',
      parentTaskId: null, sprintId: null, version: 0n, assignees: [], _count: { children: 0 } };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]), $executeRaw: jest.fn().mockResolvedValue(1),
      project: { update: jest.fn().mockResolvedValue({ nextTaskNumber: 2 }) },
      sprint: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      task: {
        findFirst: jest.fn().mockResolvedValue(current), count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...current, ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...current, ...data })),
      },
    };
    const prisma = { ...tx, $transaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaService;
    const kafka = { emit: jest.fn().mockImplementation(() => { throw new Error('Kafka offline'); }) } as unknown as ClientKafka;
    const calendar = new TaskCalendarEventService(prisma, kafka);
    const service = new TaskService(prisma, access, { record: jest.fn(), recordMany: jest.fn() } as unknown as ActivityService,
      {} as NotificationOutboxService, calendar);
    return { current, tx, prisma, kafka, service };
  }

  it('commits task and calendar outbox together without contacting Kafka', async () => {
    const { service, tx, kafka } = setupTask();
    await expect(service.create(userId, projectId, { title: 'Saved offline' })).resolves.toMatchObject({ title: 'Saved offline' });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect((tx.$executeRaw.mock.calls[0][0] as TemplateStringsArray).join('')).toContain('notification_outbox');
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('does not create a task when its target sprint is active', async () => {
    const { service, tx } = setupTask();
    tx.sprint.findFirst.mockResolvedValue({ id: 'sprint', status: 'ACTIVE' });
    await expect(service.create(userId, projectId, { title: 'No orphan', sprintId: crypto.randomUUID() })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.task.create).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('creates a task directly in a planned sprint in the same transaction', async () => {
    const { service, tx } = setupTask();
    const sprintId = crypto.randomUUID();
    tx.sprint.findFirst.mockResolvedValue({ id: sprintId, status: 'PLANNED' });
    await expect(service.create(userId, projectId, { title: 'Atomic', sprintId })).resolves.toMatchObject({ sprintId });
    expect(access.requireCanManageSprints).toHaveBeenCalledWith(userId, projectId);
  });

  it('rejects a third hierarchy level when reparenting a task with children', async () => {
    const { service, tx, current } = setupTask();
    tx.task.findFirst.mockResolvedValueOnce(current).mockResolvedValueOnce({ parentTaskId: null, status: 'TODO', archived: false, sprintId: null });
    tx.task.count.mockResolvedValue(1);
    await expect(service.update(userId, current.id, { parentTaskId: crypto.randomUUID() })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.task.update).not.toHaveBeenCalled();
  });

  it('moves a reparented task into its new parent sprint', async () => {
    const { service, tx, current } = setupTask();
    const sprintId = crypto.randomUUID();
    tx.task.findFirst.mockResolvedValueOnce(current).mockResolvedValueOnce({ parentTaskId: null, status: 'TODO', archived: false, sprintId });
    tx.sprint.findMany.mockResolvedValue([{ id: sprintId, status: 'PLANNED' }]);
    await service.update(userId, current.id, { parentTaskId: crypto.randomUUID() });
    expect(tx.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sprint: { connect: { id: sprintId } } }) }));
  });

  it('rejects a time without offset and preserves explicit null date removal', async () => {
    const { service, tx, current } = setupTask();
    await expect(service.create(userId, projectId, { title: 'Time', startDate: '2026-09-05T09:00:00' })).rejects.toBeInstanceOf(BadRequestException);
    await service.update(userId, current.id, { startDate: null, dueDate: null });
    expect(tx.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ startDate: null, dueDate: null }) }));
  });

  it('prevents stealing a task from an active sprint into a planned sprint', async () => {
    const target = { id: crypto.randomUUID(), projectId, status: 'PLANNED' };
    const tx = { $queryRaw: jest.fn().mockResolvedValue([]),
      sprint: { findUnique: jest.fn().mockResolvedValue(target), findMany: jest.fn().mockResolvedValue([{ status: 'ACTIVE' }]) },
      task: { findMany: jest.fn().mockResolvedValue([{ id: 'task', parentTaskId: null, sprintId: 'source', status: 'TODO' }]), updateMany: jest.fn() },
    };
    const prisma = { ...tx, $transaction: jest.fn(async (fn) => fn(tx)) } as unknown as PrismaService;
    const service = new SprintService(prisma, access);
    await expect(service.addTasks(userId, target.id, { taskIds: ['task'] })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.task.updateMany).not.toHaveBeenCalled();
  });

  it('rejects null for nonnullable update fields but accepts null dates/assignee', async () => {
    for (const dto of [plainToInstance(UpdateTaskDto, { title: null }), plainToInstance(UpdateProjectDto, { name: null }), plainToInstance(UpdateSprintDto, { goal: null })]) {
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
    expect(await validate(plainToInstance(UpdateTaskDto, { startDate: null, dueDate: null, assigneeUserId: null }))).toEqual([]);
  });

  it('keeps numeric task ranks ordered beyond ten tasks', () => {
    const ranks = Array.from({ length: 12 }, (_, i) => normalizeTaskRank(String((i + 1) * 1000))!);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it('rejects oversized attachments before any database write', async () => {
    const prisma = { $transaction: jest.fn() } as unknown as PrismaService;
    const files = new ProjectFileService(prisma, access);
    await expect(files.upload(userId, projectId, { originalname: 'large.pdf', mimetype: 'application/pdf', size: 11 * 1024 * 1024, buffer: Buffer.from('x') })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
