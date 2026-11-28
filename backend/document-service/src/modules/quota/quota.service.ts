import { Injectable, BadRequestException } from '@nestjs/common';
import { ItemType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

import { QuotaConstants } from '../../common/constants/quota.constants';

export interface StorageQuotaBreakdown {
  documentsBytes: number;
  mediaBytes: number;
  otherBytes: number;
}

const DOCUMENT_MIME_PREFIXES = ['text/'];
const DOCUMENT_MIME_TOKENS = [
  'pdf',
  'word',
  'document',
  'spreadsheet',
  'excel',
  'presentation',
  'powerpoint',
  'csv',
  'rtf',
];
const MEDIA_MIME_PREFIXES = ['image/', 'video/', 'audio/'];

function classifyMimeCategory(
  mimeType: string | null,
  name: string,
): keyof StorageQuotaBreakdown {
  const mime = (mimeType ?? '').toLowerCase();
  if (MEDIA_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return 'mediaBytes';
  }
  if (
    DOCUMENT_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
    DOCUMENT_MIME_TOKENS.some((token) => mime.includes(token)) ||
    /\.(pdf|docx?|xlsx?|pptx?|txt|md|csv|rtf)$/i.test(name)
  ) {
    return 'documentsBytes';
  }
  return 'otherBytes';
}

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch a user's storage quota. If it doesn't exist, create a default 5GB quota.
   */
  async getOrCreateQuota(userId: string) {
    const quota = await this.prisma.userStorageQuota.findUnique({
      where: { userId },
    });

    if (!quota) {
      // Default quota: 5 GB = 5 * 1024 * 1024 * 1024 bytes
      const defaultMaxBytes =
        BigInt(QuotaConstants.DEFAULT_MAX_GB) *
        BigInt(QuotaConstants.BYTES_PER_GB);
      await this.prisma.userStorageQuota.createMany({
        data: {
          userId,
          maxBytes: defaultMaxBytes,
          usedBytes: BigInt(0),
        },
        skipDuplicates: true,
      });
      return this.prisma.userStorageQuota.findUniqueOrThrow({
        where: { userId },
      });
    }

    return quota;
  }

  /**
   * Check if a proposed size change will exceed the user's storage limit.
   */
  async checkQuota(userId: string, additionalBytes: number): Promise<boolean> {
    const quota = await this.getOrCreateQuota(userId);
    const newUsedBytes = quota.usedBytes + BigInt(additionalBytes);

    if (newUsedBytes > quota.maxBytes) {
      const neededMB = (additionalBytes / QuotaConstants.BYTES_PER_MB).toFixed(
        2,
      );
      const freeMB = (
        Number(quota.maxBytes - quota.usedBytes) / QuotaConstants.BYTES_PER_MB
      ).toFixed(2);
      throw new BadRequestException(
        `Insufficient storage. Need ${neededMB} MB more, but only ${freeMB} MB.`,
      );
    }

    return true;
  }

  /**
   * Modify the user's used storage count.
   */
  async reserve(
    tx: Prisma.TransactionClient,
    userId: string,
    additionalBytes: number,
  ) {
    if (!Number.isSafeInteger(additionalBytes) || additionalBytes < 0)
      throw new BadRequestException(
        'File size must be a non-negative safe integer',
      );
    await tx.userStorageQuota.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const changed =
      await tx.$executeRaw`UPDATE user_storage_quotas SET used_bytes = used_bytes + ${BigInt(additionalBytes)}, updated_at = NOW()
      WHERE user_id = ${userId}::uuid AND used_bytes + ${BigInt(additionalBytes)} <= max_bytes`;
    if (changed !== 1)
      throw new BadRequestException('Insufficient storage for this file');
  }
  async getQuotaWithBreakdown(userId: string) {
    const [quota, files] = await Promise.all([
      this.getOrCreateQuota(userId),
      this.prisma.documentItem.findMany({
        where: {
          ownerUserId: userId,
          type: ItemType.FILE,
        },
        select: {
          mimeType: true,
          name: true,
          sizeBytes: true,
        },
      }),
    ]);

    const breakdown: StorageQuotaBreakdown = {
      documentsBytes: 0,
      mediaBytes: 0,
      otherBytes: 0,
    };

    for (const file of files) {
      const category = classifyMimeCategory(file.mimeType, file.name);
      breakdown[category] += Number(file.sizeBytes);
    }

    return {
      ...quota,
      breakdown,
    };
  }

  async updateUsedBytes(userId: string, bytesDiff: number) {
    await this.getOrCreateQuota(userId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE user_storage_quotas SET used_bytes = GREATEST(0, used_bytes + ${BigInt(bytesDiff)}), updated_at = NOW() WHERE user_id = ${userId}::uuid`;
      return tx.userStorageQuota.findUniqueOrThrow({ where: { userId } });
    });
  }
}
