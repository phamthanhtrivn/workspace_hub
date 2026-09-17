import { ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ClientKafka } from '@nestjs/microservices';
import { ActivityService } from "../src/modules/activity/activity.service";
import { InvitationService } from "../src/modules/invitation/invitation.service";
import { LabelService } from "../src/modules/label/label.service";
import { NotificationOutboxService } from "../src/modules/notification-outbox/notification-outbox.service";
import { ProjectAccessService } from "../src/modules/project/project-access.service";
import {
  InvitationStatus,
  ProjectMemberStatus,
  ProjectRole,
  ProjectStatus,
  TaskStatus,
} from "../src/modules/project/project.enums";
import { TaskPolicyService } from "../src/modules/task/task-policy.service";
import { TaskCalendarEventService } from "../src/modules/notification-outbox/task-calendar-event.service";
import { TaskService } from "../src/modules/task/task.service";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { authHeaders, withProjectHttpApp } from './project-http-app';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration("Project Service database integration", () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const database = prisma as unknown as PrismaService;

  beforeAll(() => prisma.$connect());

  afterEach(async () => {
    await prisma.project.deleteMany();
    await prisma.$executeRaw`DELETE FROM notification_outbox`;
  });

  afterAll(() => prisma.$disconnect());

  async function createProject(
    options: {
      allowOwnEdit?: boolean;
    } = {},
  ) {
    const now = new Date();
    const ownerId = crypto.randomUUID();
    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: "Integration project",
        ownerId,
        status: ProjectStatus.ACTIVE,
        archived: false,
        createdAt: now,
        updatedAt: now,
        setting: {
          create: {
            id: crypto.randomUUID(),
            allowMemberCreateTask: true,
            allowMemberEditOwnTask: options.allowOwnEdit ?? true,
            allowMemberEditOthersTask: false,
            allowMemberInvite: false,
          },
        },
        members: {
          create: {
            id: crypto.randomUUID(),
            userId: ownerId,
            role: ProjectRole.ADMIN,
            status: ProjectMemberStatus.ACTIVE,
            joinedAt: now,
            updatedAt: now,
          },
        },
      },
      include: { setting: true },
    });
    return { project, ownerId };
  }

  async function createTask(projectId: string, createdBy: string) {
    const now = new Date();
    return prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        taskNumber: 1,
        title: "Integration task",
        priority: "MEDIUM",
        status: TaskStatus.TODO,
        createdBy,
        reporterId: createdBy,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  function taskServices() {
    const access = new ProjectAccessService(database);
    const policy = new TaskPolicyService(database, access);
    const calendar = new TaskCalendarEventService(database, {} as ClientKafka);
    const userProfiles = {
      getProfileByUserId: jest.fn().mockResolvedValue(null),
      getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as import('../src/modules/user-profile-snapshot/user-profile-snapshot.service').UserProfileSnapshotService;
    const tasks = new TaskService(database, access, new ActivityService(database, policy, userProfiles), {} as NotificationOutboxService, calendar);
    return { access, tasks };
  }

  it('persists the task and calendar outbox atomically without Kafka', async () => {
    const { project, ownerId } = await createProject();
    const { tasks } = taskServices();
    const created = await tasks.create(ownerId, project.id, { title: 'Durable task', startDate: '2026-09-05T02:00:00Z' });
    const events = await prisma.notificationOutbox.findMany({ where: { eventType: 'PROJECT_TASK_CALENDAR' } });
    expect(events).toHaveLength(1);
    expect(events[0].payload).toEqual({ taskId: created.id });
    await expect(prisma.task.findUnique({ where: { id: created.id } })).resolves.toMatchObject({ title: 'Durable task' });
  });

  it('preserves rank order for twelve tasks in PostgreSQL', async () => {
    const { project, ownerId } = await createProject();
    const { tasks } = taskServices();
    for (let index = 1; index <= 12; index++) {
      await tasks.create(ownerId, project.id, { title: String(index), rank: String(index * 1000) });
    }
    const result = await tasks.findAll(ownerId, project.id, { page: 1, limit: 100 });
    expect(result.items.map((task) => task.title)).toEqual(Array.from({ length: 12 }, (_, index) => String(index + 1)));
  });

  it('backfills existing numeric task ranks without changing custom ranks', async () => {
    const { project, ownerId } = await createProject();
    const { tasks } = taskServices();
    for (const rank of ['1000', '10000', '2000', 'custom']) {
      const created = await tasks.create(ownerId, project.id, { title: rank });
      await prisma.task.update({ where: { id: created.id }, data: { rank } });
    }
    const migration = readFileSync(join(__dirname, '../database/migrations/V11__normalize_task_ranks.sql'), 'utf8');
    await prisma.$executeRawUnsafe(migration);
    const result = await prisma.task.findMany({ where: { projectId: project.id }, orderBy: { rank: 'asc' } });
    expect(result.map((task) => task.title)).toEqual(['1000', '2000', '10000', 'custom']);
    expect(result[3].rank).toBe('custom');
  });

  it('validates task HTTP payloads and persists timezone dates and explicit date removal', async () => {
    const { project, ownerId } = await createProject();
    const { tasks } = taskServices();
    await withProjectHttpApp(tasks, async (url) => {
      const headers = { ...authHeaders(ownerId), 'content-type': 'application/json' };
      const path = `${url}/api/projects/${project.id}/tasks`;
      const invalid = await fetch(path, { method: 'POST', headers, body: JSON.stringify({ title: 'No offset', startDate: '2026-09-05T09:00:00' }) });
      expect(invalid.status).toBe(400);
      const created = await fetch(path, { method: 'POST', headers, body: JSON.stringify({ title: 'HTTP task', startDate: '2026-09-05T09:00:00+07:00' }) });
      expect(created.status).toBe(201);
      const { data: task } = await created.json();
      expect(task.startDate).toBe('2026-09-05T02:00:00.000Z');
      const taskUrl = `${url}/api/tasks/${task.id}`;
      expect((await fetch(taskUrl, { method: 'PATCH', headers, body: JSON.stringify({ title: null }) })).status).toBe(400);
      const cleared = await fetch(taskUrl, { method: 'PATCH', headers, body: JSON.stringify({ startDate: null, dueDate: null }) });
      expect(cleared.status).toBe(200);
      expect((await cleared.json()).data).toMatchObject({ startDate: null, dueDate: null });
      expect(await prisma.task.count({ where: { projectId: project.id } })).toBe(1);
    });
  });

  it("enforces the project permission matrix", async () => {
    const { project, ownerId } = await createProject();
    const memberId = crypto.randomUUID();
    const now = new Date();
    await prisma.projectMember.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          projectId: project.id,
          userId: memberId,
          role: ProjectRole.MEMBER,
          status: ProjectMemberStatus.ACTIVE,
          canEditOwnTask: true,
          joinedAt: now,
          updatedAt: now,
        },
      ],
    });
    const access = new ProjectAccessService(database);

    await expect(
      access.requireOwner(ownerId, project.id),
    ).resolves.toMatchObject({ id: project.id });
    await expect(
      access.requireOwner(memberId, project.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      access.requireReadAccess(crypto.randomUUID(), project.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      access.requireCanEditTask(memberId, project.id, memberId),
    ).resolves.toMatchObject({ id: project.id });
    await expect(
      access.requireCanEditTask(memberId, project.id, ownerId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rolls back task creation when activity recording fails", async () => {
    const { project, ownerId } = await createProject();
    const access = {
      requireCanCreateTask: jest.fn().mockResolvedValue(project),
    } as unknown as ProjectAccessService;
    const activities = {
      record: jest.fn().mockRejectedValue(new Error("activity insert failed")),
    } as unknown as ActivityService;
    const notifications = {} as NotificationOutboxService;
    const service = new TaskService(
      database,
      access,
      activities,
      notifications,
      { publishUpsert: jest.fn() } as unknown as TaskCalendarEventService,
    );

    await expect(
      service.create(ownerId, project.id, { title: "Rollback me" }),
    ).rejects.toThrow("activity insert failed");
    await expect(
      prisma.task.count({ where: { projectId: project.id } }),
    ).resolves.toBe(0);
  });

  it("accepts an invitation only once under concurrent requests", async () => {
    const { project, ownerId } = await createProject();
    const inviteeId = crypto.randomUUID();
    const invitation = await prisma.projectInvitation.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        invitedUserId: inviteeId,
        invitedBy: ownerId,
        status: InvitationStatus.PENDING,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const service = new InvitationService(
      database,
      {} as ProjectAccessService,
      {
        publishProject: jest.fn().mockResolvedValue(undefined),
      } as unknown as TaskCalendarEventService,
      {
        enqueueProjectInvitationStatus: jest.fn().mockResolvedValue(undefined),
      } as unknown as NotificationOutboxService,
    );

    const results = await Promise.allSettled([
      service.accept(inviteeId, invitation.id),
      service.accept(inviteeId, invitation.id),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    await expect(
      prisma.projectMember.count({
        where: {
          projectId: project.id,
          userId: inviteeId,
          status: ProjectMemberStatus.ACTIVE,
        },
      }),
    ).resolves.toBe(1);
  });

  it("keeps one label mapping under concurrent attachment", async () => {
    const { project, ownerId } = await createProject();
    const task = await createTask(project.id, ownerId);
    const label = await prisma.taskLabel.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        name: "Backend",
        color: "#0052CC",
      },
    });
    const taskPolicy = {
      requireEditable: jest.fn().mockResolvedValue(task),
    } as unknown as TaskPolicyService;
    const userProfiles = {
      getProfileByUserId: jest.fn().mockResolvedValue(null),
      getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as import('../src/modules/user-profile-snapshot/user-profile-snapshot.service').UserProfileSnapshotService;
    const activities = new ActivityService(database, taskPolicy, userProfiles);
    const service = new LabelService(
      database,
      {} as ProjectAccessService,
      activities,
      taskPolicy,
    );

    const results = await Promise.allSettled([
      service.attach(ownerId, task.id, label.id),
      service.attach(ownerId, task.id, label.id),
    ]);

    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    for (const result of results) {
      if (result.status === "rejected")
        expect(result.reason).toBeInstanceOf(ConflictException);
    }
    await expect(
      prisma.taskLabelMapping.count({
        where: { taskId: task.id, labelId: label.id },
      }),
    ).resolves.toBe(1);
  });
});
