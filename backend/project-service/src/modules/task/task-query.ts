import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TaskStatus } from '../project/project.enums';
import { GetProjectTasksQueryDto } from './dto/get-project-tasks-query.dto';

export const taskInclude = {
  _count: { select: { children: { where: { archived: false, deletedAt: null } } } },
  checklists: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] },
  assignees: { orderBy: { assignedAt: 'asc' } },
  labelMappings: { include: { label: true }, orderBy: { labelId: 'asc' } },
} satisfies Prisma.TaskInclude;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TaskStatusCounts = Record<TaskStatus, number>;

export function emptyTaskStatusCounts(): TaskStatusCounts {
  return {
    [TaskStatus.TODO]: 0,
    [TaskStatus.IN_PROGRESS]: 0,
    [TaskStatus.IN_REVIEW]: 0,
    [TaskStatus.DONE]: 0,
    [TaskStatus.CANCELLED]: 0,
  };
}

export function parseAssigneeUserIds(value?: string): string[] {
  if (!value) return [];
  const userIds = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (userIds.some((userId) => !UUID_PATTERN.test(userId))) {
    throw new BadRequestException('Invalid assignee user id filter');
  }

  return [...new Set(userIds)];
}

export function buildProjectTaskWhere(
  projectId: string,
  userId: string,
  query: GetProjectTasksQueryDto,
): Prisma.TaskWhereInput {
  const assigneeUserIds = parseAssigneeUserIds(query.assigneeUserIds);

  if (query.unassigned && assigneeUserIds.length > 0) {
    throw new BadRequestException(
      'Cannot filter by assignees and unassigned tasks at the same time',
    );
  }

  const and: Prisma.TaskWhereInput[] = [];
  const search = query.search?.trim();

  if (search) {
    and.push({ title: { contains: search, mode: 'insensitive' } });
  }
  if (query.unassigned) {
    and.push({ assignees: { none: {} } });
  } else if (assigneeUserIds.length > 0) {
    and.push({ assignees: { some: { userId: { in: assigneeUserIds } } } });
  }
  if (query.onlyMine) {
    and.push({ assignees: { some: { userId } } });
  }

  return {
    projectId,
    archived: false,
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

export function buildTaskStatusCounts(
  rows: Array<{ status: string; _count: { _all: number } }>,
): TaskStatusCounts {
  const counts = emptyTaskStatusCounts();
  for (const row of rows) {
    if (row.status in counts) {
      counts[row.status as TaskStatus] = row._count._all;
    }
  }
  return counts;
}
