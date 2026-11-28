import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { UpdateMeetingHistoryVisibilityDto } from './dto/update-meeting-history-visibility.dto';
import { MeetingHistoryPreferenceService } from './services/meeting-history-preference.service';
import { MEETING_SUCCESS_MESSAGES } from './types/meeting.enums';
import {
  BulkUpdateMeetingHistoryVisibilityDto,
  UndoMeetingHistoryBatchDto,
} from './dto/bulk-update-meeting-history-visibility.dto';
import { MeetingHistoryBulkService } from './services/meeting-history-bulk.service';

@Controller('api/meetings/history')
export class MeetingHistoryPreferenceController {
  constructor(
    private readonly preferences: MeetingHistoryPreferenceService,
    private readonly bulk: MeetingHistoryBulkService,
  ) {}

  @Patch('visibility/bulk')
  async updateBulkVisibility(
    @Headers('x-user-id') userId: string,
    @Body() dto: BulkUpdateMeetingHistoryVisibilityDto,
  ) {
    return {
      message: MEETING_SUCCESS_MESSAGES.HISTORY_VISIBILITY_UPDATED,
      data: await this.bulk.updateVisibility(userId, dto),
    };
  }

  @Post('visibility/undo')
  async undoBatch(
    @Headers('x-user-id') userId: string,
    @Body() dto: UndoMeetingHistoryBatchDto,
  ) {
    return {
      message: MEETING_SUCCESS_MESSAGES.HISTORY_VISIBILITY_UPDATED,
      data: await this.bulk.undoBatch(userId, dto.batchId),
    };
  }

  @Patch(':meetingId/visibility')
  async updateVisibility(
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateMeetingHistoryVisibilityDto,
  ) {
    return {
      message: MEETING_SUCCESS_MESSAGES.HISTORY_VISIBILITY_UPDATED,
      data: await this.preferences.updateVisibility(
        meetingId,
        userId,
        dto.hidden,
      ),
    };
  }
}
