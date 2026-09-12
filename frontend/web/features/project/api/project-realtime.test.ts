import { describe, expect, it } from 'vitest';
import { projectQueriesForEvent } from './project-realtime';

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
});
