import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { TaskMutationService } from './task-mutation.service';
import { buildProjectTaskWhere, taskInclude } from './task-query';
import { GetProjectTasksQueryDto } from './dto/get-project-tasks-query.dto';

function fixture(canEdit = true) {
  const task = {
    id: 'task',
    projectId: 'project',
    createdBy: 'creator',
    status: 'TODO',
    version: 1,
  };
  const writes: Array<Record<string, unknown>> = [];
  const sync: Array<Record<string, unknown>> = [];
  const activities: unknown[][] = [];
  let transactions = 0;
  const transaction = {
    $queryRaw: async () => [],
    task: {
      findMany: async () => [],
      updateMany: async () => ({ count: 0 }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        writes.push(data);

        return { ...task, ...data, version: 2 };
      },
    },
  };
  const dependencies = [
    {
      requireCanEditTask: async () => {
        if (!canEdit) throw new ForbiddenException();
      },
    },
    {
      $transaction: async (
        operation: (tx: typeof transaction) => Promise<void>,
      ) => {
        transactions++;

        return operation(transaction);
      },
    },
    {
      enqueue: async (deleted: Record<string, unknown>) => {
        sync.push(deleted);
      },
    },
    {},
    {
      record: async (...args: unknown[]) => {
        activities.push(args);
      },
    },
    { findTask: async () => task },
    {},
    {},
  ] as unknown as ConstructorParameters<typeof TaskMutationService>;

  return {
    service: new TaskMutationService(...dependencies),
    writes,
    sync,
    activities,
    transactionCount: () => transactions,
  };
}

test('deleting a task retains its soft-delete marker, synchronization and activity', async () => {
  const context = fixture();
  await context.service.delete('editor', 'task');
  assert.equal(context.transactionCount(), 1);
  assert.equal(context.writes.length, 1);
  assert.deepEqual(Object.keys(context.writes[0]).sort(), [
    'deletedAt',
    'version',
  ]);
  assert.ok(context.writes[0].deletedAt instanceof Date);
  assert.equal(context.sync[0].deletedAt, context.writes[0].deletedAt);
  assert.deepEqual(context.activities[0].slice(0, 5), [
    'task',
    'editor',
    'deleted',
    null,
    context.writes[0].deletedAt.toISOString(),
  ]);
});

test('task deletion requires edit permission before writing or emitting events', async () => {
  const context = fixture(false);
  await assert.rejects(
    context.service.delete('assignee', 'task'),
    ForbiddenException,
  );
  assert.equal(context.transactionCount(), 0);
  assert.equal(context.writes.length, 0);
  assert.equal(context.sync.length, 0);
  assert.equal(context.activities.length, 0);
});

test('task lists and subtask counts still exclude soft-deleted tasks', () => {
  const where = buildProjectTaskWhere(
    'project',
    'member',
    new GetProjectTasksQueryDto(),
  );
  assert.deepEqual(where, { projectId: 'project', deletedAt: null });
  assert.deepEqual(taskInclude._count.select.children.where, {
    deletedAt: null,
  });
});
