import { ConflictException } from '@nestjs/common';
import { TaskStatus } from './project.enums';
import { assertTaskEditable, assertTaskStatusTransition } from './task-edit.guard';

describe('assertTaskEditable', () => {
  it.each([
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.IN_REVIEW,
  ])('allows active status %s', (status) => {
    expect(() => assertTaskEditable(status)).not.toThrow();
  });

  it.each([TaskStatus.DONE, TaskStatus.CANCELLED])(
    'rejects terminal status %s',
    (status) => {
      expect(() => assertTaskEditable(status)).toThrow(ConflictException);
    },
  );
});

describe('assertTaskStatusTransition', () => {
  it('allows moving forward, skipping stages, or cancelling', () => {
    expect(() => assertTaskStatusTransition(TaskStatus.TODO, TaskStatus.IN_REVIEW)).not.toThrow();
    expect(() => assertTaskStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED)).not.toThrow();
  });

  it('rejects moving backwards', () => {
    expect(() => assertTaskStatusTransition(TaskStatus.IN_REVIEW, TaskStatus.TODO)).toThrow(
      ConflictException,
    );
  });
});
