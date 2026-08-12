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
  useUpdatePrivacySettingsMutation,
  useUserSettingsQuery,
} from "../hooks/useUserSettingQueries";
import { getUserSettingErrorMessage } from "../utils/user-setting-error";

const SettingsTab = React.memo(function SettingsTab() {
  const { data: settingsResponse, isLoading } = useUserSettingsQuery();
  const privacyMutation = useUpdatePrivacySettingsMutation();
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
    toast.info("Theme, language, and timezone saving is not available yet.");
  };

  const handlePrivacyChange = (checked: boolean) => {
    if (!settingsForm) return;

    updateLocalSetting("allowSearchByEmail", checked);
    privacyMutation.mutate(
      { allowSearchByEmail: checked },
      {
        onError: (error) => {
          updateLocalSetting("allowSearchByEmail", !checked);
          toast.error(
            getUserSettingErrorMessage(
              error,
              "Could not update privacy settings.",
            ),
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
      <h3 className="text-2xl font-black text-slate-800">
        Workspace preferences
      </h3>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Theme</label>
          <select
            value={settingsForm.theme}
            onChange={(e) =>
              updateLocalSetting("theme", e.target.value as UserTheme)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value={UserTheme.LIGHT}>Light</option>
            <option value={UserTheme.DARK}>Dark</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Language</label>
          <select
            value={settingsForm.language}
            onChange={(e) =>
              updateLocalSetting("language", e.target.value as UserLanguage)
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value={UserLanguage.EN}>English</option>
            <option value={UserLanguage.VI}>Vietnamese</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Timezone</label>
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
        <h4 className="text-lg font-bold text-slate-800">Privacy</h4>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="font-bold text-slate-800 text-sm">
              Allow search by email
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Other people can find you by your email address.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settingsForm.allowSearchByEmail ?? true}
              onChange={(e) => handlePrivacyChange(e.target.checked)}
              disabled={privacyMutation.isPending}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <button
          onClick={handleSaveSettings}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] cursor-pointer"
        >
          <Save className="h-4 w-4" />
          Save settings
        </button>
      </div>
    </div>
  );
});

export default SettingsTab;
