import { DEFAULT_TIME_ZONE } from './constants/pomodoro.constants';
import { Injectable } from '@nestjs/common';
import { CreatePomodoroSessionDto } from './dto/create-pomodoro-session.dto';
import { GetPomodoroSessionsQueryDto } from './dto/get-pomodoro-sessions-query.dto';
import { SavePomodoroConfigDto } from './dto/save-pomodoro-config.dto';
import { SavePomodoroTimerStateDto } from './dto/save-pomodoro-timer-state.dto';
import { SavePomodoroAmbientPreferencesDto } from './dto/save-pomodoro-ambient-preferences.dto';
import type { PomodoroAudioResponse } from './types/pomodoro-audio';
import { PomodoroConfigService } from './pomodoro-config.service';
import { PomodoroTimerService } from './pomodoro-timer.service';
import { PomodoroStatisticsService } from './pomodoro-statistics.service';
import { PomodoroSessionService } from './pomodoro-session.service';

@Injectable()
export class PomodoroService {
  constructor(
    private readonly config: PomodoroConfigService,
    private readonly timer: PomodoroTimerService,
    private readonly statistics: PomodoroStatisticsService,
    private readonly sessions: PomodoroSessionService,
  ) {}
  async getConfig(userId: string) {
    return this.config.getConfig(userId);
  }

  async saveConfig(userId: string, dto: SavePomodoroConfigDto) {
    return this.config.saveConfig(userId, dto);
  }

  async getAudios(): Promise<PomodoroAudioResponse[]> {
    return this.config.getAudios();
  }

  async getAmbientPreferences(userId: string) {
    return this.config.getAmbientPreferences(userId);
  }

  async saveAmbientPreferences(
    userId: string,
    dto: SavePomodoroAmbientPreferencesDto,
  ) {
    return this.config.saveAmbientPreferences(userId, dto);
  }

  async getState(userId: string) {
    return this.timer.getState(userId);
  }

  async saveState(userId: string, dto: SavePomodoroTimerStateDto) {
    return this.timer.saveState(userId, dto);
  }

  async deleteState(userId: string, expectedVersion: number) {
    return this.timer.deleteState(userId, expectedVersion);
  }

  async today(userId: string, timeZone = DEFAULT_TIME_ZONE) {
    return this.statistics.today(userId, timeZone);
  }

  async dailyStats(
    userId: string,
    date?: string,
    timeZone = DEFAULT_TIME_ZONE,
  ) {
    return this.statistics.dailyStats(userId, date, timeZone);
  }

  async create(userId: string, dto: CreatePomodoroSessionDto) {
    return this.sessions.create(userId, dto);
  }

  async list(userId: string, query: GetPomodoroSessionsQueryDto) {
    return this.statistics.list(userId, query);
  }
}
