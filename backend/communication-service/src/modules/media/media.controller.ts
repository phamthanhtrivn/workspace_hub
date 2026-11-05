import { Body, Controller, Post, Headers, Get, Query, Header } from '@nestjs/common';
import { PresignRequestDto } from './dto/presign-request.dto';
import { MediaService } from './media.service';
import { MEDIA_API_PATH, MEDIA_ACCESS_ROUTE } from '../../common/types/media.constants';

@Controller(MEDIA_API_PATH)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(MEDIA_ACCESS_ROUTE)
  @Header('Cache-Control', 'no-store')
  getAccessUrl(@Query('key') key: string, @Headers('x-user-id') userId: string) {
    return this.mediaService.getAccessUrl(key, userId);
  }

  @Post('presign')
  async generatePresignedUrls(
    @Body() body: PresignRequestDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.mediaService.generatePresignedUrls(body, userId);
  }
}
