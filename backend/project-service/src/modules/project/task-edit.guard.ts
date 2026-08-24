import { ConflictException } from '@nestjs/common';
import { isTerminalTaskStatus, TaskStatus } from './project.enums';

const ACTIVE_STATUS_ORDER: Record<string, number> = {
  [TaskStatus.TODO]: 0,
  [TaskStatus.IN_PROGRESS]: 1,
  [TaskStatus.IN_REVIEW]: 2,
  [TaskStatus.DONE]: 3,
};

export function assertTaskEditable(status: string): void {
  if (isTerminalTaskStatus(status)) {
    throw new ConflictException('Completed or cancelled tasks are read-only');
  }
}

export function assertTaskStatusTransition(current: string, next: string): void {
  if (current === next || next === TaskStatus.CANCELLED) return;
  const currentOrder = ACTIVE_STATUS_ORDER[current];
  const nextOrder = ACTIVE_STATUS_ORDER[next];
  if (currentOrder === undefined || nextOrder === undefined || nextOrder < currentOrder) {
    throw new ConflictException('Task status cannot move backwards');
  }
}
