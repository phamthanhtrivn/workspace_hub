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
import { POMODORO_AUDIO_MESSAGES } from './constants/pomodoro-audio.constants';
import type { PomodoroAudioResponse } from './types/pomodoro-audio';
import { buildPomodoroAudioUrl } from './utils/pomodoro-audio-url';
import { BUILTIN_POMODORO_AUDIOS } from './constants/builtin-pomodoro-audios';

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
      create: {
        userId,
        ...dto,
        ambientTrackId: DEFAULT_AMBIENT_PREFERENCES.trackId,
      },
      update: { ...dto },
    });
  }

  async getAudios(): Promise<PomodoroAudioResponse[]> {
    const audios = await this.prisma.pomodoroAudio.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        category: true,
        s3Key: true,
        sortOrder: true,
        isActive: true,
      },
    });
    const configuredIds = new Set(audios.map((audio) => audio.id));
    const configuredAudios = audios.flatMap(({ isActive, ...audio }) =>
      isActive
        ? [
            {
              ...audio,
              url: buildPomodoroAudioUrl(audio.id),
            },
          ]
        : [],
    );
    return [
      ...BUILTIN_POMODORO_AUDIOS.filter(
        (audio) => !configuredIds.has(audio.id),
      ),
      ...configuredAudios,
    ].sort(
      (first, second) =>
        first.sortOrder - second.sortOrder || first.id.localeCompare(second.id),
    );
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
        where: { id: dto.trackId },
        select: { id: true, isActive: true },
      });
      const available = audio
        ? audio.isActive
        : BUILTIN_POMODORO_AUDIOS.some((builtin) => builtin.id === dto.trackId);
      if (!available)
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
