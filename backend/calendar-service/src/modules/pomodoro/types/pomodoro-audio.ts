import type { PomodoroAudio } from '@prisma/client';

export type PomodoroAudioResponse = Pick<
  PomodoroAudio,
  'id' | 'name' | 'description' | 'icon' | 'category' | 'sortOrder'
> & { s3Key: string | null; url: string };
