import { Controller, Get, Headers, BadRequestException } from '@nestjs/common';
import { QuotaService } from './quota.service';

@Controller('api/documents/quota')
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @Get()
  async getQuota(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new BadRequestException('Thiếu x-user-id header');
    }

    const quota = await this.quotaService.getOrCreateQuota(userId);
    return {
      message: 'Lấy thông tin dung lượng lưu trữ thành công',
      data: quota,
    };
  }
}
