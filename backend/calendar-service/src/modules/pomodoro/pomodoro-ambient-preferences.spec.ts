import { PrismaService } from '../../prisma/prisma.service';
import { PomodoroService } from './pomodoro.service';
import { DEFAULT_AMBIENT_PREFERENCES } from './constants/pomodoro-ambient.constants';

describe('Pomodoro audio preferences', () => {
  const firstUser = '11111111-1111-1111-1111-111111111111';
  const secondUser = '22222222-2222-2222-2222-222222222222';
  const prisma = { pomodoroConfig: { findUnique: jest.fn(), upsert: jest.fn() } };
  const service = new PomodoroService(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());

  it('returns defaults without creating a configuration', async () => {
    prisma.pomodoroConfig.findUnique.mockResolvedValue(null);
    await expect(service.getAmbientPreferences(firstUser)).resolves.toEqual(DEFAULT_AMBIENT_PREFERENCES);
    expect(prisma.pomodoroConfig.upsert).not.toHaveBeenCalled();
  });

  it('reads each user configuration independently and exposes only preferences', async () => {
    prisma.pomodoroConfig.findUnique.mockResolvedValueOnce({ ambientTrackId: 'none', ambientVolume: 0, ambientAutoPlayOnFocus: false })
      .mockResolvedValueOnce({ ambientTrackId: 'rain_heavy', ambientVolume: 1, ambientAutoPlayOnFocus: true });
    await expect(service.getAmbientPreferences(firstUser)).resolves.toEqual({ trackId: 'none', volume: 0, autoPlayOnFocus: false });
    await expect(service.getAmbientPreferences(secondUser)).resolves.toEqual({ trackId: 'rain_heavy', volume: 1, autoPlayOnFocus: true });
    expect(prisma.pomodoroConfig.findUnique).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { userId: firstUser } }));
    expect(prisma.pomodoroConfig.findUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { userId: secondUser } }));
  });

  it('upserts only audio fields and returns the saved preference contract', async () => {
    const preferences = { trackId: 'custom_1720000000000_abcde', volume: 0.25, autoPlayOnFocus: false };
    const fields = { ambientTrackId: preferences.trackId, ambientVolume: preferences.volume, ambientAutoPlayOnFocus: false };
    prisma.pomodoroConfig.upsert.mockResolvedValue(fields);
    await expect(service.saveAmbientPreferences(firstUser, preferences)).resolves.toEqual(preferences);
    expect(prisma.pomodoroConfig.upsert).toHaveBeenCalledWith({
      where: { userId: firstUser }, create: { userId: firstUser, ...fields }, update: fields,
      select: { ambientTrackId: true, ambientVolume: true, ambientAutoPlayOnFocus: true },
    });
  });

  it('saving timer configuration never writes audio fields', async () => {
    const config = { focusDuration: 30, shortBreak: 5, longBreak: 15, longBreakInterval: 2,
      autoStartBreak: false, autoStartFocus: false, soundEnabled: true, soundType: 'chime',
      soundVolume: 0.7, notificationEnabled: true, dailyGoalPomodoros: 8 };
    prisma.pomodoroConfig.upsert.mockResolvedValue(config);
    await service.saveConfig(secondUser, config);
    expect(prisma.pomodoroConfig.upsert).toHaveBeenCalledWith({
      where: { userId: secondUser }, create: { userId: secondUser, ...config }, update: config,
    });
  });
});
