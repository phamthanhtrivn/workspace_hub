import { Controller, Logger, UseInterceptors } from '@nestjs/common';
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
import { InvalidKafkaPayload } from '../../infrastructure/kafka/invalid-kafka-payload';
import { UserEventInterceptor } from '../../infrastructure/kafka/user-event.interceptor';

@Controller()
@UseInterceptors(UserEventInterceptor)
export class TaskSyncConsumer {
  private readonly logger = new Logger(TaskSyncConsumer.name);
  constructor(private readonly tasks: TaskSyncService) {}
  @EventPattern(KAFKA_TOPICS.PROJECT_TASK_SYNC)
  async handle(@Payload() payload: unknown): Promise<void> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new InvalidKafkaPayload('Invalid task sync payload');
    }
    const event = plainToInstance(TaskSyncEventDto, payload);
    if (
      validateSync(event, { whitelist: true, forbidNonWhitelisted: true })
        .length ||
      BigInt(event.version) > 9223372036854775807n
    ) {
      throw new InvalidKafkaPayload('Invalid task sync contract');
    }
    try {
      await this.tasks.apply(event);
    } catch {
      this.logger.error(`Task sync failed for ${event.taskId}`);
      throw new KafkaRetriableException('Task sync could not be persisted');
    }
  }
}
