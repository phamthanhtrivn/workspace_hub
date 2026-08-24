import { ConflictException } from '@nestjs/common';
import { TaskStatus } from './project.enums';
import { assertTaskEditable } from './task-edit.guard';

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
