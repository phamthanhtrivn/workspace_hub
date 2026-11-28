import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Header,
} from '@nestjs/common';
import { IndependentAuthentication } from '../../common/decorators/http-authentication.decorator';
import { MEDIA_API_PATH } from '../../common/types/media.constants';
import { VoiceTranscriptService } from './voice-transcript.service';
import { VoiceSourceRequestDto } from './dto/voice-source-request.dto';
import {
  VOICE_TRANSCRIPT,
  VoiceChatType,
} from './types/voice-transcript.constants';

@Controller(MEDIA_API_PATH)
export class VoiceTranscriptController {
  constructor(private readonly service: VoiceTranscriptService) {}
  @Get(VOICE_TRANSCRIPT.route)
  @Header('Cache-Control', 'private, no-store')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Query('chatType', new ParseEnumPipe(VoiceChatType))
    chatType: VoiceChatType,
  ) {
    return this.service.proxy(id, userId, chatType, false);
  }
  @Post(VOICE_TRANSCRIPT.route)
  @Header('Cache-Control', 'private, no-store')
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Query('chatType', new ParseEnumPipe(VoiceChatType))
    chatType: VoiceChatType,
  ) {
    return this.service.proxy(id, userId, chatType, true);
  }
}

@IndependentAuthentication()
@Controller(VOICE_TRANSCRIPT.internalRoute)
export class VoiceTranscriptSourceController {
  constructor(private readonly service: VoiceTranscriptService) {}
  @Post(':id/source')
  source(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-internal-service-key') key: string,
    @Body() body: VoiceSourceRequestDto,
  ) {
    this.service.authorizeSource(key);
    return this.service.source(id, body.actorId, body.chatType);
  }
}
