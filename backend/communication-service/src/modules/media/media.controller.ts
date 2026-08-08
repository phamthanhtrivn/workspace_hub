import { Body, Controller, Post } from '@nestjs/common';
import { PresignRequestDto } from './dto/presign-request.dto';
import { MediaService } from './media.service';

@Controller('api/medias')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presign')
  async generatePresignedUrls(@Body() body: PresignRequestDto) {
    return this.mediaService.generatePresignedUrls(body);
  }
}
