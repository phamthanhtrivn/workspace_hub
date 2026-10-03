import type { PomodoroAudio } from '@prisma/client';

export type PomodoroAudioResponse = Pick<
  PomodoroAudio,
  'id' | 'name' | 'description' | 'icon' | 'category' | 's3Key' | 'sortOrder'
> & { url: string };
