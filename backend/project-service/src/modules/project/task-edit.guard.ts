import { ConflictException } from '@nestjs/common';
import { isTerminalTaskStatus } from './project.enums';

export function assertTaskEditable(status: string): void {
  if (isTerminalTaskStatus(status)) {
    throw new ConflictException('Completed or cancelled tasks are read-only');
  }
}
