import { Module } from "@nestjs/common";
import { VoiceTranscriptController } from "./voice-transcript.controller";
import { VoiceTranscriptService } from "./voice-transcript.service";
@Module({
  controllers: [VoiceTranscriptController],
  providers: [VoiceTranscriptService],
})
export class VoiceTranscriptModule {}
