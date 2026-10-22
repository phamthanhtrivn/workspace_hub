import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RecordingAuthGuard } from '../../common/auth/recording-auth.guard';
import { MeetingCaptionsService } from './services/meeting-captions.service';

@Controller('api/meetings')
@UseGuards(RecordingAuthGuard)
export class MeetingCaptionsController {
  constructor(private readonly captions: MeetingCaptionsService) {}

  @Get(':joinToken/captions')
  async status(
    @Param('joinToken') token: string,
    @Headers('x-user-id') user: string,
  ) {
    return {
      message: 'Caption availability retrieved',
      data: await this.captions.status(token, user),
    };
  }

  @Post(':joinToken/captions')
  @HttpCode(200)
  async start(
    @Param('joinToken') token: string,
    @Headers('x-user-id') user: string,
  ) {
    return {
      message: 'Live captions enabled',
      data: await this.captions.start(token, user),
    };
  }

  @Delete(':joinToken/captions')
  async release(
    @Param('joinToken') token: string,
    @Headers('x-user-id') user: string,
  ) {
    return {
      message: 'Caption viewer released',
      data: await this.captions.release(token, user),
    };
  }
}
