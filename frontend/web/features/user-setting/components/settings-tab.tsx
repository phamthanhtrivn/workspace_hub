"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { USER_SETTING_SAVE_ERROR, UserTheme } from "../types/settings.enums";
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
        allowNewDirectMessages: settingsForm.allowNewDirectMessages,
        muteNotification: settingsForm.muteNotification,
      },
      {
        onSuccess: () => {
          toast.success("Settings saved successfully");
        },
        onError: (error) => {
          toast.error(
            getUserSettingErrorMessage(error, USER_SETTING_SAVE_ERROR),
          );
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-link" />
      </div>
    );
  }

  if (!settingsForm) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <h3 className="text-section-title font-semibold text-foreground">Preferences</h3>

      <div className="space-y-4">
        <SettingSelect
          label="Appearance"
          ariaLabel="Theme"
          value={settingsForm.theme}
          options={THEME_OPTIONS}
          onChange={(theme) => updateLocalSetting("theme", theme)}
          disabled={settingsMutation.isPending}
        />
        <p className="text-sm text-muted-foreground">
          Choose Light or Dark, then save your settings to apply it.
        </p>

        <h4 className="text-lg font-semibold text-foreground">Notifications</h4>

        <SettingSwitchCard
          title="Mute Notifications"
          description="Turn off all notification alerts across Workspace Hub"
          checked={settingsForm.muteNotification ?? false}
          onCheckedChange={(checked) =>
            updateLocalSetting("muteNotification", checked)
          }
          disabled={settingsMutation.isPending}
        />

        <hr className="my-4 border-border" />
        <h4 className="text-lg font-semibold text-foreground">Privacy</h4>

        <SettingSwitchCard
          title="Allow New Direct Messages"
          description="Allow others to send you a first direct message. Existing chats can continue when this is off."
          checked={settingsForm.allowNewDirectMessages ?? true}
          onCheckedChange={(checked) =>
            updateLocalSetting("allowNewDirectMessages", checked)
          }
          disabled={settingsMutation.isPending}
        />

        <Button
          onClick={handleSaveSettings}
          disabled={settingsMutation.isPending}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary cursor-pointer"
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
