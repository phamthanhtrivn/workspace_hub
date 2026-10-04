import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Prisma } from '@prisma/client';
import { ProjectListQueryDto } from './dto/project-list-query.dto';
import { ProjectService } from './project.service';
import { ProjectMemberStatus, ProjectStatus } from './project.enums';

describe('Project list assigned task filter', () => {
  const userId = '22222222-2222-4222-8222-222222222222';

  function setup() {
    const prisma = {
      project: {
        count: jest.fn<Promise<number>, [Prisma.ProjectCountArgs]>().mockResolvedValue(21),
        findMany: jest.fn<Promise<unknown[]>, [Prisma.ProjectFindManyArgs]>().mockResolvedValue([]),
      },
      $transaction: jest.fn((requests: Promise<unknown>[]) => Promise.all(requests)),
    };
    const profiles = { getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()) };
    const dependencies = [prisma, {}, profiles, {}, {}, {}] as unknown as ConstructorParameters<typeof ProjectService>;
    const service = new ProjectService(...dependencies);
    return { service, prisma, profiles };
  }

  it('applies assignment and access filters to both count and the paginated query', async () => {
    const { service, prisma } = setup();
    const query = plainToInstance(ProjectListQueryDto, { page: 2, limit: 10, status: ProjectStatus.ACTIVE, hasAssignedTasks: 'true' });
    const result = await service.findAll(userId, query);
    const where = prisma.project.count.mock.calls[0][0].where;
    expect(where).toEqual(expect.objectContaining({
      archived: false,
      status: ProjectStatus.ACTIVE,
      tasks: { some: { archived: false, deletedAt: null, assignees: { some: { userId } } } },
      AND: expect.arrayContaining([{ OR: [
        { ownerId: userId },
        { members: { some: { userId, status: ProjectMemberStatus.ACTIVE } } },
      ] }]),
    }));
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 10, take: 10 }));
    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 21, totalPages: 3, hasNext: true });
  });

  it.each([undefined, false])('keeps the default project list when hasAssignedTasks is %s', async (hasAssignedTasks) => {
    const { service, prisma } = setup();
    await service.findAll(userId, plainToInstance(ProjectListQueryDto, { hasAssignedTasks }));
    expect(prisma.project.count.mock.calls[0][0].where).not.toHaveProperty('tasks');
    expect(prisma.project.count.mock.calls[0][0].where?.AND).toHaveLength(1);
  });

  it.each(['true', 'false', undefined])('accepts the optional query value %s', async (hasAssignedTasks) => {
    expect(await validate(plainToInstance(ProjectListQueryDto, { hasAssignedTasks }))).toEqual([]);
  });

  it.each(['yes', '1', null])('rejects malformed query value %s', async (hasAssignedTasks) => {
    const errors = await validate(plainToInstance(ProjectListQueryDto, { hasAssignedTasks }));
    expect(errors.some((error) => error.property === 'hasAssignedTasks')).toBe(true);
  });
});
