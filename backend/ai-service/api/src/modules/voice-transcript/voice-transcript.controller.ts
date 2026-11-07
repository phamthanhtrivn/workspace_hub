import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  BadRequestException,
} from "@nestjs/common";
import { z } from "zod";
import { VoiceTranscriptService } from "./voice-transcript.service";
import { VOICE_TRANSCRIPT } from "./voice.constants";

const request = z
  .object({
    actorId: z.uuid(),
    chatType: z.enum(["CHANNEL", "DIRECT_MESSAGE"]),
  })
  .strict();
@Controller(VOICE_TRANSCRIPT.route)
export class VoiceTranscriptController {
  constructor(private readonly service: VoiceTranscriptService) {}
  @Post(":id/status")
  status(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key: string,
    @Body() body: unknown,
  ) {
    this.service.authorize(key);
    const parsed = request.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid voice transcript request");
    return this.service.status(id, parsed.data.actorId, parsed.data.chatType);
  }
  @Post(":id")
  start(
    @Param("id", ParseUUIDPipe) id: string,
    @Headers("x-internal-service-key") key: string,
    @Body() body: unknown,
  ) {
    this.service.authorize(key);
    const parsed = request.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid voice transcript request");
    return this.service.start(id, parsed.data.actorId, parsed.data.chatType);
  }
}
