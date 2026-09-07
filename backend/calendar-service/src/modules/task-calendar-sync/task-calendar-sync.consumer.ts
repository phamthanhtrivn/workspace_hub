import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';
import { TaskCalendarSyncService } from './task-calendar-sync.service';
import { ProjectTaskCalendarPayload } from './task-calendar-sync.types';

@Controller()
export class TaskCalendarSyncConsumer {
  constructor(private readonly taskCalendarSync: TaskCalendarSyncService) {}

  @EventPattern(KAFKA_CONFIG.TASK_TOPIC)
  async handle(
    @Payload()
    message: ProjectTaskCalendarPayload | { value: ProjectTaskCalendarPayload },
  ): Promise<void> {
    const payload = 'value' in message ? message.value : message;
    await this.taskCalendarSync.synchronize(payload);
  }
}
