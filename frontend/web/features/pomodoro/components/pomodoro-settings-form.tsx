"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingInput, SettingSelect, SettingSlider, SettingSwitchCard } from "@/features/user-setting/components/ui/setting-form-controls";
import { POMODORO_NUMBER_FIELDS, POMODORO_SETTINGS_MESSAGES, POMODORO_SOUND_OPTIONS } from "../constants/pomodoro-settings";
import type { PomodoroConfig } from "../types/pomodoro";
import type { PomodoroConfigSyncStatus } from "../utils/pomodoro-config-sync";
import { fromPomodoroSettingsForm, pomodoroSettingsSchema, toPomodoroSettingsForm, type PomodoroSettingsFormValues } from "../utils/pomodoro-settings-validation";
import { playPomodoroSound } from "../utils/sound";

interface PomodoroSettingsFormProps {
  config: PomodoroConfig;
  syncStatus: PomodoroConfigSyncStatus;
  onSave: (config: PomodoroConfig) => Promise<PomodoroConfig>;
}

export function PomodoroSettingsForm({ config, syncStatus, onSave }: PomodoroSettingsFormProps) {
  const { register, control, handleSubmit, reset, setError, clearErrors,
    formState: { errors, isSubmitting, isDirty } } = useForm<PomodoroSettingsFormValues>({
    resolver: zodResolver(pomodoroSettingsSchema),
    defaultValues: toPomodoroSettingsForm(config),
    mode: "onBlur",
  });
  const [soundEnabled, soundType, soundVolumePercent] = useWatch({ control, name: ["soundEnabled", "soundType", "soundVolumePercent"] });
  const disabled = isSubmitting || syncStatus === "saving";

  // Refresh clean forms after loading or synchronization, without replacing drafts.
  useEffect(() => {
    if (!isDirty && !isSubmitting) reset(toPomodoroSettingsForm(config));
  }, [config, isDirty, isSubmitting, reset]);

  const submit = handleSubmit(async (values) => {
    clearErrors("root");
    try {
      const saved = await onSave(fromPomodoroSettingsForm(values));
      reset(toPomodoroSettingsForm(saved));
      toast.success(POMODORO_SETTINGS_MESSAGES.saved);
    } catch {
      setError("root.server", { message: POMODORO_SETTINGS_MESSAGES.pending });
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <legend className="mb-4 text-lg font-bold text-slate-800">Duration & goals</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {POMODORO_NUMBER_FIELDS.map((field) => (
            <div key={field.name} className="min-w-0">
              <SettingInput label={field.label} type="number" min={field.min} max={field.max} step={1}
                {...register(field.name, { valueAsNumber: true })} error={errors[field.name]?.message} />
              {"description" in field && <p className="mt-1 text-xs text-slate-500">{field.description}</p>}
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={disabled} className="min-w-0 space-y-4 border-t border-slate-200 pt-4">
        <legend className="text-lg font-bold text-slate-800">Sound & notifications</legend>
        <Controller name="soundEnabled" control={control} render={({ field }) => (
          <SettingSwitchCard title="Alarm sound" description="Play a sound when a session ends."
            checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )} />
        <div className="space-y-4">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            <Controller name="soundType" control={control} render={({ field }) => (
              <SettingSelect label="Alarm tone" ariaLabel="Alarm tone" options={[...POMODORO_SOUND_OPTIONS]}
                value={field.value} onChange={field.onChange} disabled={disabled || !soundEnabled} className="min-w-0 flex-1" />
            )} />
            <Button type="button" variant="outline" disabled={disabled || !soundEnabled || !Number.isFinite(soundVolumePercent) || soundVolumePercent < 0 || soundVolumePercent > 100}
              onClick={() => playPomodoroSound(soundType, soundVolumePercent / 100)} className="h-10 rounded-xl">
              <Volume2 aria-hidden="true" /> Preview sound
            </Button>
          </div>
          <Controller name="soundVolumePercent" control={control} render={({ field }) => (
            <SettingSlider label="Alarm volume" unit="%" value={field.value}
              onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
              disabled={disabled || !soundEnabled} error={errors.soundVolumePercent?.message} />
          )} />
        </div>
        <Controller name="notificationEnabled" control={control} render={({ field }) => (
          <SettingSwitchCard title="Browser notifications" description="Notify you while you are in another tab or app."
            checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )} />
      </fieldset>

      <fieldset disabled={disabled} className="min-w-0 space-y-4 border-t border-slate-200 pt-4">
        <legend className="text-lg font-bold text-slate-800">Automation</legend>
        <Controller name="autoStartBreak" control={control} render={({ field }) => (
          <SettingSwitchCard title="Auto-start breaks" description="Automatically start a break when a focus session ends."
            checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )} />
        <Controller name="autoStartFocus" control={control} render={({ field }) => (
          <SettingSwitchCard title="Auto-start focus" description="Automatically start a focus session when a break ends."
            checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        )} />
      </fieldset>
      {syncStatus === "error" && <p role="alert" className="text-xs text-amber-700">{errors.root?.server?.message ?? POMODORO_SETTINGS_MESSAGES.pending}</p>}
      <Button type="submit" disabled={disabled}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)]">
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {disabled ? "Saving settings..." : "Save settings"}
      </Button>
    </form>
  );
}
