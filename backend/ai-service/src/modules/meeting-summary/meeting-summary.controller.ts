import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { MeetingSummaryService } from "./meeting-summary.service";

@Controller("internal/meeting-summaries")
export class MeetingSummaryController {
  constructor(private readonly service: MeetingSummaryService) {}

  @Post(":id/status")
  async status(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key?: string,
  ) {
    this.service.authorize(key);
    return this.service.status(id);
  }

  @Post(":id")
  async start(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key: string,
    @Body("actorId", ParseUUIDPipe) actorId: string,
  ) {
    this.service.authorize(key);
    return this.service.start(id, actorId);
  }
}
