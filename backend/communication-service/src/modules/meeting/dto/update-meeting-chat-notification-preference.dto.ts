import { IsBoolean } from 'class-validator';

export class UpdateMeetingChatNotificationPreferenceDto {
  @IsBoolean()
  chatMuted: boolean;
}
