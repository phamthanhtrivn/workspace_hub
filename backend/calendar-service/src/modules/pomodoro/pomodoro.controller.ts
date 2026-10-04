import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CreatePomodoroSessionDto } from './dto/create-pomodoro-session.dto';
import { ClearPomodoroTimerStateDto } from './dto/clear-pomodoro-timer-state.dto';
import { GetDailyStatsQueryDto } from './dto/get-daily-stats-query.dto';
import { GetPomodoroSessionsQueryDto } from './dto/get-pomodoro-sessions-query.dto';
import { GetTodaySessionsQueryDto } from './dto/get-today-sessions-query.dto';
import { SavePomodoroConfigDto } from './dto/save-pomodoro-config.dto';
import { SavePomodoroTimerStateDto } from './dto/save-pomodoro-timer-state.dto';
import { PomodoroService } from './pomodoro.service';
import { SavePomodoroAmbientPreferencesDto } from './dto/save-pomodoro-ambient-preferences.dto';
import { AMBIENT_PREFERENCES_MESSAGES, AMBIENT_PREFERENCES_ROUTE } from './constants/pomodoro-ambient.constants';
import { POMODORO_AUDIO_MESSAGES, POMODORO_AUDIO_ROUTE } from './constants/pomodoro-audio.constants';

@Controller('api/calendar/pomodoro')
export class PomodoroController {
  constructor(private readonly service: PomodoroService) {}

  @Get('config')
  async getConfig(@Headers('x-user-id') userId: string) {
    this.requireUser(userId);
    return {
      message: 'Pomodoro config retrieved',
      data: await this.service.getConfig(userId),
    };
  }

  @Put('config')
  async saveConfig(
    @Headers('x-user-id') userId: string,
    @Body() dto: SavePomodoroConfigDto,
  ) {
    this.requireUser(userId);
    return {
      message: 'Pomodoro config saved',
      data: await this.service.saveConfig(userId, dto),
    };
  }

  @Get(POMODORO_AUDIO_ROUTE)
  async getAudios(@Headers('x-user-id') userId: string) {
    this.requireUser(userId);
    return { message: POMODORO_AUDIO_MESSAGES.retrieved, data: await this.service.getAudios() };
  }

  @Get(AMBIENT_PREFERENCES_ROUTE)
  async getAmbientPreferences(@Headers('x-user-id') userId: string) {
    this.requireUser(userId);
    return {
      message: AMBIENT_PREFERENCES_MESSAGES.retrieved,
      data: await this.service.getAmbientPreferences(userId),
    };
  }

  @Put(AMBIENT_PREFERENCES_ROUTE)
  async saveAmbientPreferences(
    @Headers('x-user-id') userId: string,
    @Body() dto: SavePomodoroAmbientPreferencesDto,
  ) {
    this.requireUser(userId);
    return {
      message: AMBIENT_PREFERENCES_MESSAGES.saved,
      data: await this.service.saveAmbientPreferences(userId, dto),
    };
  }

  @Get('stats/daily')
  async dailyStats(
    @Headers('x-user-id') userId: string,
    @Query() query: GetDailyStatsQueryDto,
  ) {
    this.requireUser(userId);
    return {
      message: 'Daily Pomodoro stats retrieved',
      data: await this.service.dailyStats(userId, query.date, query.timeZone),
    };
  }

  @Get('state')
  async getState(@Headers('x-user-id') userId: string) {
    this.requireUser(userId);
    return {
      message: 'Pomodoro timer state retrieved',
      data: await this.service.getState(userId),
    };
  }

  @Put('state')
  async saveState(
    @Headers('x-user-id') userId: string,
    @Body() dto: SavePomodoroTimerStateDto,
  ) {
    this.requireUser(userId);
    return {
      message: 'Pomodoro timer state saved',
      data: await this.service.saveState(userId, dto),
    };
  }

  @Delete('state')
  async deleteState(
    @Headers('x-user-id') userId: string,
    @Body() dto: ClearPomodoroTimerStateDto,
  ) {
    this.requireUser(userId);
    return {
      message: 'Pomodoro timer state cleared',
      data: await this.service.deleteState(userId, dto.expectedVersion),
    };
  }

  @Get('sessions/today')
  async today(
    @Headers('x-user-id') userId: string,
    @Query() query: GetTodaySessionsQueryDto,
  ) {
    this.requireUser(userId);
    return {
      message: 'Today Pomodoro sessions listed',
      data: await this.service.today(userId, query.timeZone),
    };
  }

  @Post('sessions')
  async create(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreatePomodoroSessionDto,
  ) {
    this.requireUser(userId);
    return {
      message: 'Pomodoro session created',
      data: await this.service.create(userId, dto),
    };
  }

  @Get('sessions')
  async list(
    @Headers('x-user-id') userId: string,
    @Query() query: GetPomodoroSessionsQueryDto,
  ) {
    this.requireUser(userId);
    return {
      message: 'Pomodoro sessions listed',
      data: await this.service.list(userId, query),
    };
  }

  private requireUser(userId: string) {
    if (!userId) throw new BadRequestException('Missing user ID');
  }
}
