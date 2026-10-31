import { SavePomodoroConfigDto } from '../dto/save-pomodoro-config.dto';
export const MAX_RANGE_MS = 93 * 24 * 60 * 60 * 1000;

export const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const DEFAULT_CONFIG: SavePomodoroConfigDto = {
  focusDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 2,
  autoStartBreak: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundType: 'chime',
  soundVolume: 0.7,
  notificationEnabled: true,
  dailyGoalPomodoros: 8,
};
