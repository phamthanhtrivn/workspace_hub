import { CloudRain, Coffee, FileAudio, Headphones, Music, Radio, VolumeX, Waves, Wind, type LucideIcon } from "lucide-react";

const POMODORO_AUDIO_ICONS: Record<string, LucideIcon> = {
  CloudRain, Coffee, FileAudio, Headphones, Music, Radio, VolumeX, Waves, Wind,
};

export function getPomodoroAudioIcon(name: string): LucideIcon {
  return Object.prototype.hasOwnProperty.call(POMODORO_AUDIO_ICONS, name)
    ? POMODORO_AUDIO_ICONS[name] : FileAudio;
}
