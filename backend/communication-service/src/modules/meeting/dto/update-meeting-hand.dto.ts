import { IsBoolean } from 'class-validator';

export class UpdateMeetingHandDto {
  @IsBoolean()
  raised!: boolean;
}
