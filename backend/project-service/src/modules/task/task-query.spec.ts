import { BadRequestException } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '../project/project.enums';
import {
  buildProjectTaskWhere,
  buildTaskStatusCounts,
  parseAssigneeUserIds,
} from './task-query';

const projectId = '11111111-1111-4111-8111-111111111111';
const currentUserId = '22222222-2222-4222-8222-222222222222';
const assigneeOne = '33333333-3333-4333-8333-333333333333';
const assigneeTwo = '44444444-4444-4444-8444-444444444444';

describe('task query helpers', () => {
  it('builds a search, status, and priority task filter', () => {
    expect(
      buildProjectTaskWhere(projectId, currentUserId, {
        page: 1,
        limit: 50,
        search: 'auth',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
      }),
    ).toEqual({
      projectId,
      archived: false,
      deletedAt: null,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      AND: [{ title: { contains: 'auth', mode: 'insensitive' } }],
    });
  });

  it('builds an assignee list filter from comma-separated user ids', () => {
    expect(
      buildProjectTaskWhere(projectId, currentUserId, {
        page: 1,
        limit: 50,
        assigneeUserIds: `${assigneeOne}, ${assigneeTwo}`,
      }),
    ).toMatchObject({
      AND: [
        {
          assignees: {
            some: { userId: { in: [assigneeOne, assigneeTwo] } },
          },
        },
      ],
    });
  });

  it('builds an unassigned task filter', () => {
    expect(
      buildProjectTaskWhere(projectId, currentUserId, {
        page: 1,
        limit: 50,
        unassigned: true,
      }),
    ).toMatchObject({
      AND: [{ assignees: { none: {} } }],
    });
  });

  it('builds an only-mine task filter using the current user', () => {
    expect(
      buildProjectTaskWhere(projectId, currentUserId, {
        page: 1,
        limit: 50,
        onlyMine: true,
      }),
    ).toMatchObject({
      AND: [{ assignees: { some: { userId: currentUserId } } }],
    });
  });

  it('rejects combined assignee and unassigned filters', () => {
    expect(() =>
      buildProjectTaskWhere(projectId, currentUserId, {
        page: 1,
        limit: 50,
        assigneeUserIds: assigneeOne,
        unassigned: true,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid assignee ids', () => {
    expect(() => parseAssigneeUserIds('not-a-user-id')).toThrow(
      BadRequestException,
    );
  });

  it('builds overall status counts with zeros for missing statuses', () => {
    expect(
      buildTaskStatusCounts([
        { status: TaskStatus.TODO, _count: { _all: 3 } },
        { status: TaskStatus.DONE, _count: { _all: 1 } },
      ]),
    ).toEqual({
      [TaskStatus.TODO]: 3,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.IN_REVIEW]: 0,
      [TaskStatus.DONE]: 1,
      [TaskStatus.CANCELLED]: 0,
    });
  });
});
