import { Controller, Logger } from '@nestjs/common';
import {
  EventPattern,
  KafkaRetriableException,
  Payload,
} from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { KAFKA_TOPICS } from '../../common/constants/kafka.constants';
import { TaskSyncEventDto } from './task-sync.dto';
import { TaskSyncService } from './task-sync.service';

@Controller()
export class TaskSyncConsumer {
  private readonly logger = new Logger(TaskSyncConsumer.name);
  constructor(private readonly tasks: TaskSyncService) {}
  @EventPattern(KAFKA_TOPICS.PROJECT_TASK_SYNC)
  async handle(@Payload() payload: unknown): Promise<void> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      this.logger.warn('Ignored invalid task sync payload');
      return;
    }
    const event = plainToInstance(TaskSyncEventDto, payload);
    if (
      validateSync(event, { whitelist: true, forbidNonWhitelisted: true })
        .length ||
      BigInt(event.version) > 9223372036854775807n
    ) {
      this.logger.warn('Ignored invalid task sync contract');
      return;
    }
    try {
      await this.tasks.apply(event);
    } catch (error) {
      this.logger.error(
        `Task sync failed for ${event.taskId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new KafkaRetriableException('Task sync could not be persisted');
    }
  }
}
