import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { KafkaContext, KafkaRetriableException } from '@nestjs/microservices';
import { createHash, randomUUID } from 'node:crypto';
import { catchError, from, map, Observable, tap, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { InvalidUserEvent } from './user-event-policy';
import { kafkaConsumerState } from './consumer-lifecycle';

@Injectable()
export class UserEventInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => { kafkaConsumerState.handlingFailed = false; }),
      catchError((error: unknown) => {
        if (!(error instanceof InvalidUserEvent)) {
          kafkaConsumerState.handlingFailed = true;
          return throwError(() => new KafkaRetriableException('User event dependency unavailable'));
        }
        return from(this.quarantine(context.switchToRpc().getContext<KafkaContext>())).pipe(
          map(() => { kafkaConsumerState.handlingFailed = false; return undefined; }),
          catchError(() => {
            kafkaConsumerState.handlingFailed = true;
            return throwError(() => new KafkaRetriableException('User event quarantine unavailable'));
          }),
        );
      }),
    );
  }
  private async quarantine(context: KafkaContext): Promise<void> {
    const message = context.getMessage();
    const value: unknown = message.value;
    const serialized = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value) ?? 'null');
    const digest = createHash('sha256').update(serialized).digest('hex');
    await this.prisma.$executeRaw`
      INSERT INTO rejected_kafka_events (id, topic, partition, "offset", payload_digest, reason)
      VALUES (${randomUUID()}::uuid, ${context.getTopic()}, ${context.getPartition()}, ${message.offset}, ${digest}, 'Invalid user event contract')
      ON CONFLICT (topic, partition, "offset") DO NOTHING
    `;
  }
}
