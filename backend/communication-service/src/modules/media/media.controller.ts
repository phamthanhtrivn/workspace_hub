import { Body, Controller, Post, Headers } from '@nestjs/common';
import { PresignRequestDto } from './dto/presign-request.dto';
import { MediaService } from './media.service';

@Controller('api/medias')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presign')
  async generatePresignedUrls(
    @Body() body: PresignRequestDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.mediaService.generatePresignedUrls(body, userId);
  }
}
