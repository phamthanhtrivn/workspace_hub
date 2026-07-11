"use client";

import React, { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { UserSettings } from "../types/user-setting.types";
import { getUserSettings, updatePrivacySettings } from "../api/user-setting.api";

const SettingsTab = React.memo(function SettingsTab() {
  const [settingsForm, setSettingsForm] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await getUserSettings();
      if (response && response.success) {
        setSettingsForm(response.data);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    // Other settings (theme, language) - backend API not yet ready
  };

  const handlePrivacyChange = async (checked: boolean) => {
    if (!settingsForm) return;
    const previousSettings = { ...settingsForm };
    
    // Optimistic update
    setSettingsForm({ ...settingsForm, allowSearchByEmail: checked });
    
    try {
      await updatePrivacySettings({ allowSearchByEmail: checked });
    } catch (error) {
      console.error("Failed to update privacy settings:", error);
      // Revert on error
      setSettingsForm(previousSettings);
    }
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
      <h3 className="text-2xl font-black text-slate-800">Tùy chỉnh hệ thống</h3>

      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">
            Giao diện (Theme)
          </label>
          <select
            value={settingsForm.theme}
            onChange={(e) =>
              setSettingsForm({ ...settingsForm, theme: e.target.value })
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="light">Sáng (Light)</option>
            <option value="dark">Tối (Dark)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Ngôn ngữ</label>
          <select
            value={settingsForm.language}
            onChange={(e) =>
              setSettingsForm({ ...settingsForm, language: e.target.value })
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="vi">Vietnamese</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-slate-700">Múi giờ</label>
          <select
            value={settingsForm.timezone}
            onChange={(e) =>
              setSettingsForm({ ...settingsForm, timezone: e.target.value })
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <hr className="my-4 border-slate-200" />
        <h4 className="text-lg font-bold text-slate-800">Quyền riêng tư</h4>
        
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="font-bold text-slate-800 text-sm">Cho phép tìm kiếm qua email</p>
            <p className="text-xs text-slate-500 mt-0.5">Người khác có thể tìm thấy bạn bằng địa chỉ email</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={settingsForm.allowSearchByEmail ?? true}
              onChange={(e) => handlePrivacyChange(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
          </label>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-[var(--color-primary)] disabled:opacity-70 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </div>
    </div>
  );
});

export default SettingsTab;
