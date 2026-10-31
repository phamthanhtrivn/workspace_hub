import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';

const CLEANUP_BATCH_SIZE = 50;
const CLEANUP_RETRY_MS = 60_000;

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);
  private running = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: S3Service,
  ) {}

  async enqueue(tx: Prisma.TransactionClient, keys: string[]) {
    for (const s3Key of new Set(keys)) {
      await tx.storageCleanupJob.upsert({
        where: { s3Key },
        create: { s3Key },
        update: { nextAttemptAt: new Date() },
      });
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = await this.prisma.storageCleanupJob.findMany({
        where: { nextAttemptAt: { lte: new Date() } },
        take: CLEANUP_BATCH_SIZE,
        orderBy: { nextAttemptAt: 'asc' },
      });
      for (const job of jobs) {
        try {
          const [documents, versions] = await Promise.all([
            this.prisma.documentItem.count({ where: { s3Key: job.s3Key } }),
            this.prisma.documentVersion.count({ where: { s3Key: job.s3Key } }),
          ]);
          // A legacy import may still share this object. Its eventual deletion
          // will enqueue the key again when the last reference is removed.
          if (!documents && !versions) await this.storage.deleteFile(job.s3Key);
          await this.prisma.storageCleanupJob.deleteMany({
            where: { id: job.id },
          });
        } catch (error) {
          await this.prisma.storageCleanupJob.update({
            where: { id: job.id },
            data: {
              attemptCount: { increment: 1 },
              nextAttemptAt: new Date(Date.now() + CLEANUP_RETRY_MS),
            },
          });
          this.logger.warn(
            `Storage cleanup ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
