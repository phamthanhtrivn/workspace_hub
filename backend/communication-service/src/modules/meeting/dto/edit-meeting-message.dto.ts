import { IsString } from 'class-validator';

export class EditMeetingMessageDto {
  @IsString()
  content: string;
}
