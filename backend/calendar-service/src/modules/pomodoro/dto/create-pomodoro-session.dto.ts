import { PomodoroSessionStatus, PomodoroSessionType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreatePomodoroSessionDto {
  @IsOptional() @IsUUID() eventId?: string;
  @IsOptional() @IsUUID() taskId?: string;
  @IsEnum(PomodoroSessionType) sessionType: PomodoroSessionType;
  @IsEnum(PomodoroSessionStatus) status: PomodoroSessionStatus;
  @IsDateString() startedAt: string;
  @IsDateString() endedAt: string;
  @IsInt() @Min(1) @Max(86400) plannedSeconds: number;
  @IsInt() @Min(0) @Max(86400) actualSeconds: number;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsString() @MaxLength(500) interruptionReason?: string;
}
