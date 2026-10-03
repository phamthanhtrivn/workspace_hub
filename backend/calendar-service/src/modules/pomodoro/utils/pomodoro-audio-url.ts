import { ServiceUnavailableException } from '@nestjs/common';
import { POMODORO_AUDIO_MESSAGES } from '../constants/pomodoro-audio.constants';

export function buildPomodoroAudioUrl(baseUrl: string | undefined, s3Key: string): string {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl?.trim() ?? '');
  } catch {
    throw new ServiceUnavailableException(POMODORO_AUDIO_MESSAGES.configurationMissing);
  }
  if (!['https:', 'http:'].includes(parsed.protocol) ||
      parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new ServiceUnavailableException(POMODORO_AUDIO_MESSAGES.configurationMissing);
  }
  const encodedKey = s3Key.split('/').map(encodeURIComponent).join('/');
  return `${parsed.href.replace(/\/+$/, '')}/${encodedKey}`;
}
