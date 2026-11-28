import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
const RETENTION_MS = 24 * 60 * 60 * 1000;
@Injectable()
export class DocumentImportCleanupService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DocumentImportCleanupService.name);
  private running = false;
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: S3Service,
  ) {}
  onModuleInit() {
    this.timer = setInterval(
      () => {
        void this.cleanup().catch(() =>
          this.logger.warn('Copied-attachment cleanup will retry.'),
        );
      },
      10 * 60 * 1000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async cleanup() {
    if (this.running) return;
    this.running = true;
    try {
      const cutoff = new Date(Date.now() - RETENTION_MS);
      const candidates = await this.prisma.documentAttachmentImport.findMany({
        where: {
          updatedAt: { lt: cutoff },
          status: { in: ['READY', 'FAILED', 'PREPARING'] },
        },
        take: 100,
        orderBy: { updatedAt: 'asc' },
      });
      for (const candidate of candidates)
        await this.prisma.$transaction(async (tx) => {
          const claim = await tx.documentAttachmentImport.updateMany({
            where: {
              id: candidate.id,
              updatedAt: { lt: cutoff },
              OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
            },
            data: { status: 'CLEANING' },
          });
          if (!claim.count) return;
          const keys = Array.isArray(candidate.result)
            ? candidate.result.flatMap((attachment) =>
                attachment &&
                typeof attachment === 'object' &&
                !Array.isArray(attachment) &&
                typeof attachment.s3Key === 'string'
                  ? [attachment.s3Key]
                  : [],
              )
            : [];
          const where = {
            s3Key: { in: keys },
            message: { recalled: false, deletedAt: null },
          };
          const referenced =
            keys.length &&
            (await tx.media.count({ where })) +
              (await tx.directMedia.count({ where })) +
              (await tx.meetingMedia.count({ where }));
          if (referenced) {
            await tx.documentAttachmentImport.update({
              where: { id: candidate.id },
              data: { status: 'READY' },
            });

            return;
          }
          for (const s3Key of keys)
            await tx.mediaCopyCleanup.upsert({
              where: { s3Key },
              update: {},
              create: { s3Key },
            });
          await tx.documentAttachmentImport.update({
            where: { id: candidate.id },
            data: { status: 'EXPIRED', leaseToken: null, leaseUntil: null },
          });
        });
      for (const job of await this.prisma.mediaCopyCleanup.findMany({
        take: 100,
        orderBy: { createdAt: 'asc' },
      })) {
        try {
          await this.storage.deleteFile(job.s3Key);
          await this.prisma.mediaCopyCleanup.delete({
            where: { s3Key: job.s3Key },
          });
        } catch {
          this.logger.warn('A copied-attachment cleanup job will be retried.');
        }
      }
    } finally {
      this.running = false;
    }
  }
}
