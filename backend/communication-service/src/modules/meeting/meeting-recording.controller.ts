import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ListRecordingsDto,
  RecordingPermissionDto,
  RenameRecordingDto,
  ShareRecordingDto,
  ShareRecordingParticipantsDto,
  StartMeetingRecordingDto,
} from './dto/meeting-recording.dto';
import { MeetingRecordingService } from './services/meeting-recording.service';
import { recordingError } from './utils/meeting-recording.utils';
import { RecordingAuthGuard } from '../../common/auth/recording-auth.guard';

@Controller('api/meetings')
@UseGuards(RecordingAuthGuard)
export class MeetingRecordingController {
  constructor(private readonly recordings: MeetingRecordingService) {}

  private user(id: string) {
    if (!id)
      recordingError(401, 'UNAUTHENTICATED', 'Authentication is required');
    return id;
  }
  private result<T>(data: T) {
    return { message: 'Recording request completed', data };
  }

  @Get('recordings')
  async list(
    @Headers('x-user-id') userId: string,
    @Query() query: ListRecordingsDto,
  ) {
    return this.result(await this.recordings.list(this.user(userId), query));
  }

  @Get('recordings/:recordingId')
  async detail(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(await this.recordings.detail(id, this.user(userId)));
  }

  @Post('recordings/:recordingId/playback-url')
  @HttpCode(200)
  async playback(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(await this.recordings.url(id, this.user(userId), false));
  }

  @Post('recordings/:recordingId/download-url')
  @HttpCode(200)
  async download(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(await this.recordings.url(id, this.user(userId), true));
  }

  @Patch('recordings/:recordingId')
  async rename(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
    @Body() dto: RenameRecordingDto,
  ) {
    return this.result(
      await this.recordings.rename(id, this.user(userId), dto.title),
    );
  }

  @Get('recordings/:recordingId/permissions')
  async permissions(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(
      await this.recordings.permissions(id, this.user(userId)),
    );
  }

  @Put('recordings/:recordingId/permissions/:userId')
  async share(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetId: string,
    @Body() dto: ShareRecordingDto,
  ) {
    if (!dto.canView)
      return this.result(
        await this.recordings.revoke(id, this.user(userId), targetId),
      );
    return this.result(
      await this.recordings.share(
        id,
        this.user(userId),
        targetId,
        dto.canDownload,
      ),
    );
  }

  @Post('recordings/:recordingId/permissions/participants')
  @HttpCode(200)
  async shareParticipants(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
    @Body() dto: ShareRecordingParticipantsDto,
  ) {
    return this.result(
      await this.recordings.shareParticipants(
        id,
        this.user(userId),
        dto.canDownload ?? false,
      ),
    );
  }

  @Delete('recordings/:recordingId/permissions/:userId')
  async revoke(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetId: string,
  ) {
    return this.result(
      await this.recordings.revoke(id, this.user(userId), targetId),
    );
  }

  @Delete('recordings/:recordingId')
  @HttpCode(202)
  async delete(
    @Headers('x-user-id') userId: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(await this.recordings.delete(id, this.user(userId)));
  }

  @Get(':joinToken/recordings/status')
  async status(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') joinToken: string,
  ) {
    return this.result(
      await this.recordings.status(joinToken, this.user(userId)),
    );
  }

  @Get(':joinToken/recordings')
  async meetingRecordings(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') joinToken: string,
    @Query() query: ListRecordingsDto,
  ) {
    return this.result(
      await this.recordings.list(this.user(userId), query, joinToken),
    );
  }

  @Post(':joinToken/recordings')
  @HttpCode(202)
  async start(
    @Headers('x-user-id') userId: string,
    @Headers('idempotency-key') key: string,
    @Param('joinToken') joinToken: string,
    @Body() dto: StartMeetingRecordingDto,
  ) {
    return this.result(
      await this.recordings.start(joinToken, this.user(userId), dto, key),
    );
  }

  @Post(':joinToken/recordings/:recordingId/stop')
  @HttpCode(202)
  async stop(
    @Headers('x-user-id') userId: string,
    @Headers('idempotency-key') key: string,
    @Param('joinToken') joinToken: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(
      await this.recordings.stop(joinToken, this.user(userId), id, key),
    );
  }

  @Patch(':joinToken/participants/:userId/recording-permission')
  async grant(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') joinToken: string,
    @Param('userId', ParseUUIDPipe) targetId: string,
    @Body() dto: RecordingPermissionDto,
  ) {
    return this.result(
      await this.recordings.grantRecording(
        joinToken,
        this.user(userId),
        targetId,
        dto.canRecord,
      ),
    );
  }
}
