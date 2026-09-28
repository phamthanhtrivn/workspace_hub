import { IsBoolean, IsIn, IsInt, IsNumber, Max, Min } from 'class-validator';

export class SavePomodoroConfigDto {
  @IsInt() @Min(1) @Max(240) focusDuration: number;
  @IsInt() @Min(1) @Max(120) shortBreak: number;
  @IsInt() @Min(1) @Max(240) longBreak: number;
  @IsInt() @Min(1) @Max(20) longBreakInterval: number;
  @IsBoolean() autoStartBreak: boolean;
  @IsBoolean() autoStartFocus: boolean;
  @IsBoolean() soundEnabled: boolean;
  @IsIn(['chime', 'bell', 'digital']) soundType: string;
  @IsNumber() @Min(0) @Max(1) soundVolume: number;
  @IsBoolean() notificationEnabled: boolean;
  @IsInt() @Min(1) @Max(100) dailyGoalPomodoros: number;
}
