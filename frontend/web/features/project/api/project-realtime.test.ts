import { describe, expect, it } from 'vitest';
import { applyTaskSocketEvent, projectQueriesForEvent } from './project-realtime';
import { TaskPriority, TaskStatus, TaskType, type Task } from '../types/project';

const baseEvent = {
  projectId: 'project-1',
  action: 'UPDATED' as const,
  actorId: 'user-1',
  occurredAt: '2026-09-12T00:00:00.000Z',
};

describe('projectQueriesForEvent', () => {
  it('invalidates only sprint and task-list queries for sprint events', () => {
    expect(projectQueriesForEvent({ ...baseEvent, resource: 'SPRINT' })).toEqual([
      { queryKey: ['projects', 'project-1', 'sprints'] },
      { queryKey: ['projects', 'project-1', 'tasks'] },
    ]);
  });

  it('also invalidates task details, comments, and activities', () => {
    expect(projectQueriesForEvent({ ...baseEvent, resource: 'COMMENT', taskId: 'task-1' })).toEqual([
      { queryKey: ['tasks', 'task-1'] },
    ]);
  });

  it('invalidates every task detail changed by a sprint operation', () => {
    expect(projectQueriesForEvent({
      ...baseEvent,
      resource: 'SPRINT',
      taskIds: ['task-1', 'task-2'],
    })).toContainEqual({ queryKey: ['tasks', 'task-2'] });
  });

  it('refreshes the project list when invitation membership may change', () => {
    expect(projectQueriesForEvent({ ...baseEvent, resource: 'INVITATION' })).toContainEqual({
      queryKey: ['projects'],
      exact: true,
    });
  });

  it('adds the complete created task payload directly to cache', () => {
    const data = {
      id: 'task-1', projectId: 'project-1', taskNumber: 1, taskType: TaskType.STORY,
      title: 'Socket task', priority: TaskPriority.HIGH, status: TaskStatus.TODO,
      createdBy: 'user-1', reporterId: 'user-1', allDay: false,
      estimatedMinutes: 30, archived: false,
    };

    const result = applyTaskSocketEvent([], {
      ...baseEvent,
      resource: 'TASK',
      action: 'CREATED',
      entityId: 'task-1',
      data,
    });

    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({ id: 'task-1', title: 'Socket task', taskType: TaskType.STORY });
  });

  it('removes a deleted task and detaches its cached children', () => {
    const parent = { id: 'task-1', parentTaskId: undefined } as Task;
    const child = { id: 'task-2', parentTaskId: 'task-1', taskType: TaskType.BUG } as Task;
    const result = applyTaskSocketEvent([parent, child], {
      ...baseEvent,
      resource: 'TASK',
      action: 'DELETED',
      entityId: 'task-1',
    });

    expect(result).toEqual([expect.objectContaining({ id: 'task-2', parentTaskId: undefined, taskType: TaskType.BUG })]);
  });
});
