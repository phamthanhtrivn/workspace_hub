import { POMODORO_AUDIO_API_PATH } from '../constants/pomodoro-audio.constants';

export function buildPomodoroAudioUrl(
  audioId: string,
): string {
  return `${POMODORO_AUDIO_API_PATH}/${encodeURIComponent(audioId)}/access-url`;
}
