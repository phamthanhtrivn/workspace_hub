import { IsInt, Max, Min } from 'class-validator';

export class ClearPomodoroTimerStateDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  expectedVersion: number;
}
