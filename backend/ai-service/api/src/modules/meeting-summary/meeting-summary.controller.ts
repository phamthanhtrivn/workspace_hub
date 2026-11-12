import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { authorizeCommunicationCaller } from "../../common/auth/service-key";
import { config } from "../../config/env.config";
import { MeetingSummaryService } from "./meeting-summary.service";

function authorize(key?: string) {
  authorizeCommunicationCaller(key, {
    enabled: config.MEETING_SUMMARY_ENABLED === "true",
    unavailable: "Meeting summaries are not configured",
  });
}

@Controller("internal/meeting-summaries")
export class MeetingSummaryController {
  constructor(private readonly service: MeetingSummaryService) {}

  @Post(":id/status")
  async status(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key?: string,
  ) {
    authorize(key);

    return this.service.status(id);
  }

  @Post(":id")
  async start(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key: string,
    @Body("actorId", ParseUUIDPipe) actorId: string,
  ) {
    authorize(key);

    return this.service.start(id, actorId);
  }
}
