"use client";

import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { USER_SETTING_SAVE_ERROR, UserTheme } from "../types/settings.enums";
import { UserSettings } from "../types/user-setting.types";
import {
  useUpdateUserSettingsMutation,
  useUserSettingsQuery,
} from "../hooks/useUserSettingQueries";
import { getUserSettingErrorMessage } from "../utils/user-setting-error";
import { QueryFeedback } from "@/components/common/query-feedback";
import { useSettingsDraft } from "../hooks/use-settings-draft";
import { UserSettingTab } from "../types/settings.enums";
import { SettingSelect, SettingSwitchCard } from "./ui/setting-form-controls";
import { Spinner } from "@/components/ui/spinner";

const THEME_OPTIONS = [
  { value: UserTheme.LIGHT, label: "Light" },
  { value: UserTheme.DARK, label: "Dark" },
];

const SettingsTab = React.memo(function SettingsTab() {
  const settingsQuery = useUserSettingsQuery();
  const { data: settingsResponse, isLoading } = settingsQuery;
  const settingsMutation = useUpdateUserSettingsMutation();
  const [settingsForm, setSettingsForm] = useState<UserSettings | null>(null);

  const [savedValue, setSavedValue] = useState("null");
  const dirty = settingsForm !== null && JSON.stringify(settingsForm) !== savedValue;
  useEffect(() => {
    if (settingsResponse?.data && !dirty) {
      setSettingsForm(settingsResponse.data); setSavedValue(JSON.stringify(settingsResponse.data));
    }
  }, [settingsResponse, dirty]);

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

  const handleSaveSettings = async () => {
    if (!settingsForm || settingsMutation.isPending) return false;
    try {
      const response = await settingsMutation.mutateAsync({
        theme: settingsForm.theme, language: settingsForm.language, timezone: settingsForm.timezone,
        allowNewDirectMessages: settingsForm.allowNewDirectMessages, muteNotification: settingsForm.muteNotification,
      });
      setSettingsForm(response.data); setSavedValue(JSON.stringify(response.data));
      toast.success("Settings saved successfully");
      return true;
    } catch (error) { toast.error(getUserSettingErrorMessage(error, USER_SETTING_SAVE_ERROR)); return false; }
  };
  useSettingsDraft(UserSettingTab.GENERAL, {
    dirty, pending: settingsMutation.isPending, save: handleSaveSettings,
    discard: () => { setSettingsForm(settingsResponse?.data ?? null); setSavedValue(JSON.stringify(settingsResponse?.data ?? null)); },
  });

  if (!settingsForm) return <QueryFeedback label="preferences" pending={isLoading} error={settingsQuery.isError} retrying={settingsQuery.isFetching} onRetry={() => settingsQuery.refetch()} />;

  return (
    <form onSubmit={event => { event.preventDefault(); void handleSaveSettings(); }} className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <QueryFeedback label="preferences" error={settingsQuery.isError} retrying={settingsQuery.isFetching} onRetry={() => settingsQuery.refetch()} />
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

        <Button aria-busy={settingsMutation.isPending || undefined}
          type="submit"
          disabled={settingsMutation.isPending}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary cursor-pointer"
        >
          {settingsMutation.isPending ? (
            <Spinner tone="inherit" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </form>
  );
});

export default SettingsTab;
