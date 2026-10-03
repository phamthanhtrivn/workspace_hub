import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class GetPomodoroSessionsQueryDto {
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsOptional() @IsUUID() eventId?: string;
  @IsOptional() @IsUUID() taskId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit: number =
    100;
}
