import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { QuotaConstants } from '../../common/constants/quota.constants';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch a user's storage quota. If it doesn't exist, create a default 5GB quota.
   */
  async getOrCreateQuota(userId: string) {
    let quota = await this.prisma.userStorageQuota.findUnique({
      where: { userId },
    });

    if (!quota) {
      // Default quota: 5 GB = 5 * 1024 * 1024 * 1024 bytes
      const defaultMaxBytes =
        BigInt(QuotaConstants.DEFAULT_MAX_GB) *
        BigInt(QuotaConstants.BYTES_PER_GB);
      quota = await this.prisma.userStorageQuota.create({
        data: {
          userId,
          maxBytes: defaultMaxBytes,
          usedBytes: BigInt(0),
        },
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
        `Không đủ dung lượng lưu trữ. Cần thêm ${neededMB} MB nhưng dung lượng trống chỉ còn ${freeMB} MB.`,
      );
    }

    return true;
  }

  /**
   * Modify the user's used storage count.
   */
  async updateUsedBytes(userId: string, bytesDiff: number) {
    const quota = await this.getOrCreateQuota(userId);
    const updatedUsedBytes = quota.usedBytes + BigInt(bytesDiff);

    return this.prisma.userStorageQuota.update({
      where: { userId },
      data: {
        usedBytes: updatedUsedBytes >= BigInt(0) ? updatedUsedBytes : BigInt(0),
      },
    });
  }
}
