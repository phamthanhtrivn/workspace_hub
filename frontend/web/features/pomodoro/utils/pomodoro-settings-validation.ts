import { z } from "zod";
import type { PomodoroConfig } from "../types/pomodoro";
import { POMODORO_NUMBER_FIELDS } from "../constants/pomodoro-settings";

function durationField(name: typeof POMODORO_NUMBER_FIELDS[number]["name"]) {
  const limits = POMODORO_NUMBER_FIELDS.find((field) => field.name === name)!;
  return z.number({ invalid_type_error: "Enter a valid number.", required_error: "Enter a number." })
    .int("Enter a whole number.").min(limits.min, `Minimum: ${limits.min}.`).max(limits.max, `Maximum: ${limits.max}.`);
}

export const pomodoroSettingsSchema = z.object({
  focusDuration: durationField("focusDuration"),
  shortBreak: durationField("shortBreak"),
  longBreak: durationField("longBreak"),
  longBreakInterval: durationField("longBreakInterval"),
  dailyGoalPomodoros: durationField("dailyGoalPomodoros"),
  soundVolumePercent: z.number({ invalid_type_error: "Enter a valid percentage." }).min(0, "Minimum: 0%.").max(100, "Maximum: 100%."),
  soundType: z.enum(["chime", "bell", "digital"]),
  soundEnabled: z.boolean(),
  notificationEnabled: z.boolean(),
  autoStartBreak: z.boolean(),
  autoStartFocus: z.boolean(),
});

export type PomodoroSettingsFormValues = z.infer<typeof pomodoroSettingsSchema>;

export function toPomodoroSettingsForm(config: PomodoroConfig): PomodoroSettingsFormValues {
  const { soundVolume, ...fields } = config;
  return { ...fields, soundVolumePercent: Number((soundVolume * 100).toFixed(2)) };
}

export function fromPomodoroSettingsForm(form: PomodoroSettingsFormValues): PomodoroConfig {
  const { soundVolumePercent, ...fields } = pomodoroSettingsSchema.parse(form);
  return { ...fields, soundVolume: soundVolumePercent / 100 };
}
