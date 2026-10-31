import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { KafkaContext } from "@nestjs/microservices";
import { createHash } from "node:crypto";
import { catchError, from, map, Observable, throwError } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class InvalidKafkaEventInterceptor implements NestInterceptor {
  private readonly logger = new Logger(InvalidKafkaEventInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        // Retry transient provider/database failures. Only invalid contracts can be acknowledged.
        if (!(error instanceof BadRequestException))
          return throwError(() => error);
        return from(
          this.quarantine(
            context.switchToRpc().getContext<KafkaContext>(),
            error,
          ),
        ).pipe(map(() => undefined));
      }),
    );
  }

  private async quarantine(
    context: KafkaContext,
    error: BadRequestException,
  ): Promise<void> {
    const topic = context.getTopic();
    const partition = context.getPartition();
    const message = context.getMessage();
    const offset = message.offset;
    const value: unknown = message.value;
    const serialized = Buffer.isBuffer(value)
      ? value
      : Buffer.from(JSON.stringify(value) ?? "null");
    const payloadDigest = createHash("sha256").update(serialized).digest("hex");
    // Persist only source coordinates and a digest: never put a raw payload or token in logs.
    await this.prisma.rejectedKafkaEvent.upsert({
      where: { topic_partition_offset: { topic, partition, offset } },
      create: {
        topic,
        partition,
        offset,
        payloadDigest,
        reason: error.message,
      },
      update: {},
    });
    this.logger.warn(
      `Quarantined invalid Kafka event at ${topic}:${partition}:${offset}`,
    );
  }
}
