import { PomodoroSessionType, PomodoroTimerStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SavePomodoroTimerStateDto {
  @IsOptional() @IsInt() @Min(1) @Max(86400) plannedSeconds?: number;
  @IsEnum(PomodoroSessionType) mode: PomodoroSessionType;
  @IsEnum(PomodoroTimerStatus) status: PomodoroTimerStatus;
  @IsOptional() @IsDateString() targetEndAt?: string;
  @IsInt() @Min(0) @Max(86400) remainingSeconds: number;
  @IsInt() @Min(0) @Max(100000) cycleCount: number;
  @IsOptional() @IsDateString() sessionStartAt?: string;
  @IsOptional() @IsUUID() eventId?: string;
  @IsOptional() @IsUUID() taskId?: string;
  @IsOptional() @IsObject() activeTask?: Record<string, unknown>;
  @IsString() @MaxLength(2000) notes: string;
  @IsInt() @Min(0) @Max(2147483646) expectedVersion: number;
}
