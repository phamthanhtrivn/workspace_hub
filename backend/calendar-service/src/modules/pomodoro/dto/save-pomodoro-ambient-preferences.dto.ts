import { IsBoolean, IsNumber, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { AMBIENT_TRACK_ID_PATTERN, MAX_AMBIENT_TRACK_ID_LENGTH } from '../constants/pomodoro-ambient.constants';

export class SavePomodoroAmbientPreferencesDto {
  @IsString()
  @MaxLength(MAX_AMBIENT_TRACK_ID_LENGTH)
  @Matches(AMBIENT_TRACK_ID_PATTERN)
  trackId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  volume: number;

  @IsBoolean()
  autoPlayOnFocus: boolean;
}
