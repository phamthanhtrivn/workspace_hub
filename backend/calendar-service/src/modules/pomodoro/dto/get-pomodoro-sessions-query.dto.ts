import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GetPomodoroSessionsQueryDto {
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsOptional() @IsUUID() eventId?: string;
  @IsOptional() @IsUUID() taskId?: string;
}
