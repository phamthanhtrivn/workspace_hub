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
  RecordingSettingsDto,
  RecordingRequestDecisionDto,
} from './dto/meeting-recording.dto';
import { MeetingRecordingService } from './services/meeting-recording.service';
import { MeetingRecordingRequestsService } from './services/meeting-recording-requests.service';
import { recordingError } from './utils/meeting-recording.utils';
import { RecordingAuthGuard } from '../../common/auth/recording-auth.guard';

@Controller('api/meetings')
@UseGuards(RecordingAuthGuard)
export class MeetingRecordingController {
  constructor(
    private readonly recordings: MeetingRecordingService,
    private readonly requests: MeetingRecordingRequestsService,
  ) {}

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

  @Post(':joinToken/recordings/capture-permission')
  async enableCapture(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') joinToken: string,
  ) {
    return this.result(
      await this.recordings.setCapturePermission(
        joinToken,
        this.user(userId),
        true,
      ),
    );
  }

  @Delete(':joinToken/recordings/capture-permission')
  async disableCapture(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') joinToken: string,
  ) {
    return this.result(
      await this.recordings.setCapturePermission(
        joinToken,
        this.user(userId),
        false,
      ),
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

  @Patch(':joinToken/recordings/settings')
  async settings(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') token: string,
    @Body() dto: RecordingSettingsDto,
  ) {
    return this.result(
      await this.recordings.configure(token, this.user(userId), dto),
    );
  }

  @Post(':joinToken/recordings/permission-requests')
  @HttpCode(200)
  async requestPermission(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') token: string,
  ) {
    return this.result(await this.requests.request(token, this.user(userId)));
  }

  @Patch(':joinToken/recordings/permission-requests/:requestId')
  async answerPermissionRequest(
    @Headers('x-user-id') userId: string,
    @Param('joinToken') token: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: RecordingRequestDecisionDto,
  ) {
    return this.result(
      await this.requests.decide(
        token,
        this.user(userId),
        requestId,
        dto.approve,
      ),
    );
  }

  @Post(':joinToken/recordings/:recordingId/pause')
  @HttpCode(202)
  async pause(
    @Headers('x-user-id') userId: string,
    @Headers('idempotency-key') key: string,
    @Param('joinToken') token: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(
      await this.recordings.pause(token, this.user(userId), id, key),
    );
  }

  @Post(':joinToken/recordings/:recordingId/resume')
  @HttpCode(202)
  async resume(
    @Headers('x-user-id') userId: string,
    @Headers('idempotency-key') key: string,
    @Param('joinToken') token: string,
    @Param('recordingId', ParseUUIDPipe) id: string,
  ) {
    return this.result(
      await this.recordings.resume(token, this.user(userId), id, key),
    );
  }
}
