import { Module } from '@nestjs/common';
import { CalendarSettingController } from './calendar-setting.controller';
import { CalendarSettingService } from './calendar-setting.service';

@Module({
  controllers: [CalendarSettingController],
  providers: [CalendarSettingService],
})
export class CalendarSettingModule {}
