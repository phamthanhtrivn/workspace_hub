import { IsString } from 'class-validator';

export class ReadMeetingMessageDto {
  @IsString()
  messageId: string;
}
