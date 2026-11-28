import { Module } from "@nestjs/common";
import { MeetingSummaryController } from "./meeting-summary.controller";
import { MeetingSummaryService } from "./meeting-summary.service";

@Module({
  controllers: [MeetingSummaryController],
  providers: [MeetingSummaryService],
})
export class MeetingSummaryModule {}
