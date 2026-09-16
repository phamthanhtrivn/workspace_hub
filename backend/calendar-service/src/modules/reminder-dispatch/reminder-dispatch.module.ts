import { Module } from '@nestjs/common';
import { KafkaProducerModule } from '../../infrastructure/kafka/kafka-producer.module';
import { ReminderDispatchService } from './reminder-dispatch.service';

@Module({
  imports: [KafkaProducerModule],
  providers: [ReminderDispatchService],
})
export class ReminderDispatchModule {}
