import { IsEnum, IsUUID } from 'class-validator';
import { VoiceChatType } from '../types/voice-transcript.constants';

export class VoiceSourceRequestDto {
  @IsUUID('4') actorId: string;
  @IsEnum(VoiceChatType) chatType: VoiceChatType;
}
