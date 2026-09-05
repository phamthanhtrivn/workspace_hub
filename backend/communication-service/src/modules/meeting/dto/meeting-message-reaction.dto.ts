import { IsString } from 'class-validator';

export class MeetingMessageReactionDto {
  @IsString()
  emoji: string;
}
