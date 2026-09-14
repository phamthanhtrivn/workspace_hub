"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserTheme, UserTimezone } from "../types/settings.enums";
import { UserSettings } from "../types/user-setting.types";
import {
  useUpdateUserSettingsMutation,
  useUserSettingsQuery,
} from "../hooks/useUserSettingQueries";
import { getUserSettingErrorMessage } from "../utils/user-setting-error";
import { SettingSelect, SettingSwitchCard } from "./ui/setting-form-controls";

const THEME_OPTIONS = [
  { value: UserTheme.LIGHT, label: "Light" },
  { value: UserTheme.DARK, label: "Dark" },
];

const TIMEZONE_OPTIONS = [
  {
    value: UserTimezone.ASIA_HO_CHI_MINH,
    label: "Asia/Ho_Chi_Minh (GMT+7)",
  },
  { value: UserTimezone.UTC, label: "UTC" },
];

const SettingsTab = React.memo(function SettingsTab() {
  const { data: settingsResponse, isLoading } = useUserSettingsQuery();
  const settingsMutation = useUpdateUserSettingsMutation();
  const [settingsForm, setSettingsForm] = useState<UserSettings | null>(null);

  useEffect(() => {
    if (settingsResponse?.data) {
      setSettingsForm(settingsResponse.data);
    }
  }, [settingsResponse]);

  const updateLocalSetting = <Key extends keyof UserSettings>(
    key: Key,
    value: UserSettings[Key],
  ) => {
    setSettingsForm((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  };

  const handleSaveSettings = () => {
    if (!settingsForm) return;

    settingsMutation.mutate(
      {
        theme: settingsForm.theme,
        language: settingsForm.language,
        timezone: settingsForm.timezone,
        allowSearchByEmail: settingsForm.allowSearchByEmail,
        muteNotification: settingsForm.muteNotification,
      },
      {
        onSuccess: () => {
          toast.success("Settings saved successfully");
        },
        onError: (error) => {
          toast.error(
            getUserSettingErrorMessage(error, "Failed to save settings"),
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!settingsForm) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h3 className="text-2xl font-black text-slate-800">Preferences</h3>

      <div className="space-y-4">
        <h4 className="text-lg font-bold text-slate-800">Notifications</h4>

        <SettingSwitchCard
          title="Mute Notifications"
          description="Turn off all notification alerts across Workspace Hub"
          checked={settingsForm.muteNotification ?? false}
          onCheckedChange={(checked) =>
            updateLocalSetting("muteNotification", checked)
          }
          disabled={settingsMutation.isPending}
        />

        <hr className="my-4 border-slate-200" />
        <h4 className="text-lg font-bold text-slate-800">Privacy</h4>

        <SettingSwitchCard
          title="Allow Search By Email"
          description="Allow other members to find you using your email address"
          checked={settingsForm.allowSearchByEmail ?? true}
          onCheckedChange={(checked) =>
            updateLocalSetting("allowSearchByEmail", checked)
          }
          disabled={settingsMutation.isPending}
        />

        <Button
          onClick={handleSaveSettings}
          disabled={settingsMutation.isPending}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] cursor-pointer"
        >
          {settingsMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
});

export default SettingsTab;
