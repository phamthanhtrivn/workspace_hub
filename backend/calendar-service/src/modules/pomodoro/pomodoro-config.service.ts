import { DEFAULT_CONFIG } from './constants/pomodoro.constants';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SavePomodoroConfigDto } from './dto/save-pomodoro-config.dto';
import { SavePomodoroAmbientPreferencesDto } from './dto/save-pomodoro-ambient-preferences.dto';
import {
  AMBIENT_PREFERENCES_SELECT,
  DEFAULT_AMBIENT_PREFERENCES,
  AMBIENT_TRACK_ID_PATTERN,
  MAX_AMBIENT_TRACK_ID_LENGTH,
} from './constants/pomodoro-ambient.constants';
import {
  POMODORO_AUDIO_BASE_URL_ENV,
  POMODORO_AUDIO_MESSAGES,
} from './constants/pomodoro-audio.constants';
import type { PomodoroAudioResponse } from './types/pomodoro-audio';
import { buildPomodoroAudioUrl } from './utils/pomodoro-audio-url';

@Injectable()
export class PomodoroConfigService {
  constructor(private readonly prisma: PrismaService) {}
  async getConfig(userId: string) {
    return (
      (await this.prisma.pomodoroConfig.findUnique({ where: { userId } })) ?? {
        userId,
        ...DEFAULT_CONFIG,
      }
    );
  }

  async saveConfig(userId: string, dto: SavePomodoroConfigDto) {
    return this.prisma.pomodoroConfig.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }

  async getAudios(): Promise<PomodoroAudioResponse[]> {
    const audios = await this.prisma.pomodoroAudio.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        category: true,
        s3Key: true,
        sortOrder: true,
      },
    });
    return audios.map((audio) => ({
      ...audio,
      url: buildPomodoroAudioUrl(
        process.env[POMODORO_AUDIO_BASE_URL_ENV],
        audio.s3Key,
      ),
    }));
  }

  async getAmbientPreferences(userId: string) {
    const config = await this.prisma.pomodoroConfig.findUnique({
      where: { userId },
      select: AMBIENT_PREFERENCES_SELECT,
    });
    return config
      ? {
          trackId: config.ambientTrackId,
          volume: config.ambientVolume,
          autoPlayOnFocus: config.ambientAutoPlayOnFocus,
        }
      : { ...DEFAULT_AMBIENT_PREFERENCES };
  }

  async saveAmbientPreferences(
    userId: string,
    dto: SavePomodoroAmbientPreferencesDto,
  ) {
    if (
      dto.trackId.length > MAX_AMBIENT_TRACK_ID_LENGTH ||
      !AMBIENT_TRACK_ID_PATTERN.test(dto.trackId)
    ) {
      throw new BadRequestException(POMODORO_AUDIO_MESSAGES.unavailable);
    }
    if (dto.trackId !== 'none') {
      const audio = await this.prisma.pomodoroAudio.findFirst({
        where: { id: dto.trackId, isActive: true },
        select: { id: true },
      });
      if (!audio)
        throw new BadRequestException(POMODORO_AUDIO_MESSAGES.unavailable);
    }
    const preferences = {
      ambientTrackId: dto.trackId,
      ambientVolume: dto.volume,
      ambientAutoPlayOnFocus: dto.autoPlayOnFocus,
    };
    const saved = await this.prisma.pomodoroConfig.upsert({
      where: { userId },
      create: { userId, ...preferences },
      update: preferences,
      select: AMBIENT_PREFERENCES_SELECT,
    });
    return {
      trackId: saved.ambientTrackId,
      volume: saved.ambientVolume,
      autoPlayOnFocus: saved.ambientAutoPlayOnFocus,
    };
  }
}
