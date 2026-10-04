import { createElement } from "react";
import { getPomodoroAudioIcon } from "../constants/pomodoro-audio-icons";

export function PomodoroAudioIcon({ name }: { name: string }) {
  return createElement(getPomodoroAudioIcon(name), { className: "size-4" });
}
