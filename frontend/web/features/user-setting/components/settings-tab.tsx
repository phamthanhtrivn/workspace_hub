"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  UserLanguage,
  UserTheme,
  UserTimezone,
} from "../types/settings.enums";
import { UserSettings } from "../types/user-setting.types";
import {
  useUpdateUserSettingsMutation,
  useUserSettingsQuery,
} from "../hooks/useUserSettingQueries";
import { getUserSettingErrorMessage } from "../utils/user-setting-error";
import { useAppIntl } from "@/features/i18n/useAppIntl";

const SettingsTab = React.memo(function SettingsTab() {
  const intl = useAppIntl();
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
          toast.success(intl.formatMessage({ id: "settings.saveSuccess" }));
        },
        onError: (error) => {
          toast.error(
            getUserSettingErrorMessage(
              error,
              intl.formatMessage({ id: "settings.saveFailed" }),
            ),
          );
        },
      },
    );
  };

  const handlePrivacyChange = (checked: boolean) => {
    if (!settingsForm) return;

    updateLocalSetting("allowSearchByEmail", checked);
  };

  const handleMuteNotificationChange = (checked: boolean) => {
    if (!settingsForm) return;

    updateLocalSetting("muteNotification", checked);
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
      <h3 className="text-2xl font-black text-slate-800">
        {intl.formatMessage({ id: "settings.preferencesTitle" })}
      </h3>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">
            {intl.formatMessage({ id: "settings.theme" })}
          </label>
          <select
            value={settingsForm.theme}
            onChange={(e) =>
              updateLocalSetting("theme", e.target.value as UserTheme)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value={UserTheme.LIGHT}>
              {intl.formatMessage({ id: "settings.theme.light" })}
            </option>
            <option value={UserTheme.DARK}>
              {intl.formatMessage({ id: "settings.theme.dark" })}
            </option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">
            {intl.formatMessage({ id: "settings.language" })}
          </label>
          <select
            value={settingsForm.language}
            onChange={(e) =>
              updateLocalSetting("language", e.target.value as UserLanguage)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value={UserLanguage.ENGLISH}>
              {intl.formatMessage({ id: "settings.language.english" })}
            </option>
            <option value={UserLanguage.VIETNAMESE}>
              {intl.formatMessage({ id: "settings.language.vietnamese" })}
            </option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">
            {intl.formatMessage({ id: "settings.timezone" })}
          </label>
          <select
            value={settingsForm.timezone}
            onChange={(e) =>
              updateLocalSetting("timezone", e.target.value as UserTimezone)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value={UserTimezone.ASIA_HO_CHI_MINH}>
              Asia/Ho_Chi_Minh (GMT+7)
            </option>
            <option value={UserTimezone.UTC}>UTC</option>
          </select>
        </div>

        <hr className="my-4 border-slate-200" />
        <h4 className="text-lg font-bold text-slate-800">
          {intl.formatMessage({ id: "settings.notifications" })}
        </h4>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="font-bold text-slate-800 text-sm">
              {intl.formatMessage({ id: "settings.muteNotification" })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {intl.formatMessage({
                id: "settings.muteNotification.description",
              })}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settingsForm.muteNotification ?? false}
              onChange={(e) => handleMuteNotificationChange(e.target.checked)}
              disabled={settingsMutation.isPending}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <hr className="my-4 border-slate-200" />
        <h4 className="text-lg font-bold text-slate-800">
          {intl.formatMessage({ id: "settings.privacy" })}
        </h4>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="font-bold text-slate-800 text-sm">
              {intl.formatMessage({ id: "settings.allowSearchByEmail" })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {intl.formatMessage({
                id: "settings.allowSearchByEmail.description",
              })}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settingsForm.allowSearchByEmail ?? true}
              onChange={(e) => handlePrivacyChange(e.target.checked)}
              disabled={settingsMutation.isPending}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={settingsMutation.isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] cursor-pointer"
        >
          {settingsMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {intl.formatMessage({ id: "settings.saveSettings" })}
        </button>
      </div>
    </div>
  );
});

export default SettingsTab;
