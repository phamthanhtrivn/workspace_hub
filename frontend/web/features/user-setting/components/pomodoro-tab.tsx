"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PomodoroSettingsForm } from "@/features/pomodoro/components/pomodoro-settings-form";
import { usePomodoroConfig } from "@/features/pomodoro/components/pomodoro-config-provider";
import { POMODORO_SETTINGS_MESSAGES } from "@/features/pomodoro/constants/pomodoro-settings";

export default function PomodoroTab() {
  const { config, isReady, loadError, syncStatus, saveConfig } = usePomodoroConfig();
  if (!isReady) return (
    <div role="status" aria-label={POMODORO_SETTINGS_MESSAGES.loading} className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h3 className="text-2xl font-black text-slate-800">Pomodoro</h3>
      {loadError && syncStatus === "idle" && <p role="status" className="text-xs text-amber-700">{POMODORO_SETTINGS_MESSAGES.local}</p>}
      <PomodoroSettingsForm config={config} syncStatus={syncStatus} onSave={saveConfig} />
    </div>
  );
}
