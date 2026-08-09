import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentService } from './document.service';

@Injectable()
export class TrashCleanupService {
  private readonly logger = new Logger(TrashCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAutomaticCleanup() {
    this.logger.log('Starting automatic trash cleanup...');

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - 30);

    // Find all expired items in the trash (archived at least 30 days ago)
    const expiredItems = await this.prisma.documentItem.findMany({
      where: {
        isArchived: true,
        archivedAt: {
          lt: expirationDate,
        },
      },
    });

    if (expiredItems.length === 0) {
      this.logger.log('No trash items expired after 30 days.');
      return;
    }

    this.logger.log(`Found ${expiredItems.length} expired items.`);

    for (const item of expiredItems) {
      try {
        // Re-check existence in case parent folder deletion already purged this item
        const exists = await this.prisma.documentItem.findUnique({
          where: { id: item.id },
        });

        if (exists) {
          await this.documentService.deleteItemPermanently(
            item.ownerUserId,
            item.ownerEmail,
            item.id,
          );
          this.logger.log(
            `Automatically permanently deleting item: ${item.name} (${item.id})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error while automatically cleaning up item ${item.id}: ${error.message}`,
        );
      }
    }
    this.logger.log('Automatic trash cleanup completed.');
  }
}
