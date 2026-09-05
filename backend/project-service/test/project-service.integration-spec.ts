import { ConflictException, ForbiddenException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ClientKafka } from '@nestjs/microservices';
import { ProjectFileService } from '../src/modules/project/project-file.service';
import { ActivityService } from "../src/modules/project/activity.service";
import { InvitationService } from "../src/modules/project/invitation.service";
import { LabelService } from "../src/modules/project/label.service";
import { NotificationOutboxService } from "../src/modules/project/notification-outbox.service";
import { ProjectAccessService } from "../src/modules/project/project-access.service";
import {
  InvitationStatus,
  ProjectMemberStatus,
  ProjectRole,
  ProjectStatus,
  ProjectType,
  ProjectVisibility,
  SprintStatus,
  TaskStatus,
} from "../src/modules/project/project.enums";
import { SprintService } from "../src/modules/project/sprint.service";
import { TaskPolicyService } from "../src/modules/project/task-policy.service";
import { TaskCalendarEventService } from "../src/modules/project/task-calendar-event.service";
import { TaskService } from "../src/modules/project/task.service";
import { PrismaService } from "../src/common/prisma/prisma.service";

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
      projectType?: ProjectType;
      visibility?: ProjectVisibility;
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
        projectType: options.projectType ?? ProjectType.GENERAL,
        visibility: options.visibility ?? ProjectVisibility.MEMBERS_ONLY,
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
            role: ProjectRole.OWNER,
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
    const tasks = new TaskService(database, access, new ActivityService(database, policy), {} as NotificationOutboxService, calendar);
    return { access, tasks, sprints: new SprintService(database, access) };
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

  it('rolls back task numbering when creation targets a running sprint', async () => {
    const { project, ownerId } = await createProject({ projectType: ProjectType.SOFTWARE_DEVELOPMENT });
    const { tasks, sprints } = taskServices();
    const sprint = await sprints.create(ownerId, project.id, { name: 'Sprint' });
    await sprints.start(ownerId, sprint.id);
    await expect(tasks.create(ownerId, project.id, { title: 'Rejected', sprintId: sprint.id })).rejects.toBeInstanceOf(ConflictException);
    expect(await prisma.task.count({ where: { projectId: project.id } })).toBe(0);
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).nextTaskNumber).toBe(1);
    expect(await prisma.notificationOutbox.count()).toBe(0);
  });

  it('keeps the active sprint unchanged when a task is added to another planned sprint', async () => {
    const { project, ownerId } = await createProject({ projectType: ProjectType.SOFTWARE_DEVELOPMENT });
    const { tasks, sprints } = taskServices();
    const source = await sprints.create(ownerId, project.id, { name: 'Source' });
    const target = await sprints.create(ownerId, project.id, { name: 'Target' });
    const task = await tasks.create(ownerId, project.id, { title: 'Work', sprintId: source.id });
    await sprints.start(ownerId, source.id);
    await expect(sprints.addTasks(ownerId, target.id, { taskIds: [task.id] })).rejects.toBeInstanceOf(ConflictException);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).sprintId).toBe(source.id);
  });

  it('returns full task relations from a sprint and prevents third-level nesting', async () => {
    const { project, ownerId } = await createProject({ projectType: ProjectType.SOFTWARE_DEVELOPMENT });
    const { tasks, sprints } = taskServices();
    const sprint = await sprints.create(ownerId, project.id, { name: 'Sprint' });
    const parent = await tasks.create(ownerId, project.id, { title: 'Parent', sprintId: sprint.id });
    await tasks.create(ownerId, project.id, { title: 'Child', parentTaskId: parent.id });
    const other = await tasks.create(ownerId, project.id, { title: 'Other' });
    await prisma.taskChecklist.create({ data: { taskId: parent.id, title: 'Check', completed: false, createdAt: new Date() } });
    await prisma.taskAssignee.create({ data: { taskId: parent.id, projectId: project.id, userId: ownerId, assignedAt: new Date() } });
    const [result] = await sprints.list(ownerId, project.id);
    const listed = result.tasks.find((item) => item.id === parent.id)!;
    expect(listed.assignees).toHaveLength(1);
    expect(listed.checklists).toHaveLength(1);
    await expect(tasks.update(ownerId, parent.id, { parentTaskId: other.id })).rejects.toBeInstanceOf(ConflictException);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: parent.id } })).parentTaskId).toBeNull();
  });

  it('stores and downloads file bytes across service instances with project access checks', async () => {
    const { project, ownerId } = await createProject({ visibility: ProjectVisibility.PRIVATE });
    const { access } = taskServices();
    const files = new ProjectFileService(database, access);
    const content = Buffer.from('Project attachment');
    const file = await files.upload(ownerId, project.id, { originalname: 'plan.txt', mimetype: 'text/plain', size: content.length, buffer: content });
    expect(file).not.toHaveProperty('content');
    const reloaded = new ProjectFileService(database, new ProjectAccessService(database));
    expect(await reloaded.list(ownerId, project.id)).toHaveLength(1);
    expect(Buffer.from((await reloaded.download(ownerId, project.id, file.id)).content)).toEqual(content);
    await expect(reloaded.download(crypto.randomUUID(), project.id, file.id)).rejects.toBeInstanceOf(ForbiddenException);
    await reloaded.remove(ownerId, project.id, file.id);
    expect(await reloaded.list(ownerId, project.id)).toEqual([]);
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

  it("enforces the project permission matrix", async () => {
    const { project, ownerId } = await createProject({
      visibility: ProjectVisibility.PRIVATE,
    });
    const delegatedMemberId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const now = new Date();
    await prisma.projectMember.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          projectId: project.id,
          userId: delegatedMemberId,
          role: ProjectRole.MEMBER,
          status: ProjectMemberStatus.ACTIVE,
          canManageSprints: true,
          joinedAt: now,
          updatedAt: now,
        },
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
      access.requireOwner(delegatedMemberId, project.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      access.requireCanManageSprints(delegatedMemberId, project.id),
    ).resolves.toMatchObject({ id: project.id });
    await expect(
      access.requireCanManageSprints(memberId, project.id),
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
      {} as NotificationOutboxService,
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

  it("allows only one active sprint under concurrent starts", async () => {
    const { project, ownerId } = await createProject({
      projectType: ProjectType.SOFTWARE_DEVELOPMENT,
    });
    const now = new Date();
    const sprints = await Promise.all(
      ["Sprint A", "Sprint B"].map((name) =>
        prisma.sprint.create({
          data: {
            id: crypto.randomUUID(),
            projectId: project.id,
            name,
            status: SprintStatus.PLANNED,
            createdBy: ownerId,
            createdAt: now,
            updatedAt: now,
          },
        }),
      ),
    );
    const access = {
      requireCanManageSprints: jest.fn().mockResolvedValue(project),
    } as unknown as ProjectAccessService;
    const service = new SprintService(database, access);

    const results = await Promise.allSettled(
      sprints.map((sprint) => service.start(ownerId, sprint.id)),
    );

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    await expect(
      prisma.sprint.count({
        where: { projectId: project.id, status: SprintStatus.ACTIVE },
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
    const activities = new ActivityService(database, taskPolicy);
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
