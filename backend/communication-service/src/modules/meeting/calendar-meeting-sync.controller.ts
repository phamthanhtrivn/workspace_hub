import { IndependentAuthentication } from '../../common/decorators/http-authentication.decorator';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CalendarMeetingSyncService } from './services/calendar-meeting-sync.service';
import { SyncCalendarMeetingDto } from './dto/sync-calendar-meeting.dto';
import { isServiceKeyValid } from '../../common/auth/service-key';

@IndependentAuthentication()
@Controller('api/meetings/internal')
export class CalendarMeetingSyncController {
  constructor(private readonly syncService: CalendarMeetingSyncService) {}
  @Get('calendar-source/:joinToken')
  async lookup(
    @Headers('x-internal-service-key') key: string,
    @Param('joinToken') joinToken: string,
  ) {
    this.assertKey(key);
    return { data: await this.syncService.lookup(joinToken) };
  }
  private assertKey(key: string) {
    const expected = process.env.INTERNAL_SERVICE_KEY;
    if (!isServiceKeyValid(key, expected))
      throw new UnauthorizedException('Invalid internal service key');
  }
  @Post('calendar-sync')
  async sync(
    @Headers('x-internal-service-key') key: string,
    @Body() dto: SyncCalendarMeetingDto,
  ) {
    this.assertKey(key);
    return { data: await this.syncService.sync(dto) };
  }
}
