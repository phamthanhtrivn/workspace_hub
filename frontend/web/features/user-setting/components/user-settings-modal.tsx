"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Settings, Shield, User, X } from "lucide-react";
import ProfileTab from "./profile-tab";
import SettingsTab from "./settings-tab";
import SessionsTab from "./sessions-tab";
import PasswordTab from "./password-tab";
import { UserSettingTab } from "../types/settings.enums";
import { useUserProfileQuery } from "../hooks/useUserSettingQueries";
import { cn } from "@/lib/utils";

type UserSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: UserSettingTab;
};

const UserSettingsModal = React.memo(function UserSettingsModal({
  isOpen,
  onClose,
  initialTab = UserSettingTab.PROFILE,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<UserSettingTab>(
    initialTab ?? UserSettingTab.PROFILE,
  );
  const { data: profileResponse } = useUserProfileQuery();
  const hasPassword = profileResponse?.data?.hasPassword ?? true;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm transition-opacity">
      <div className="flex h-full max-h-[550px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 md:flex-row">
        <div className="w-full border-b border-slate-100 bg-slate-50 p-4 md:w-56 md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center justify-between md:mb-8">
            <h2 className="text-lg font-black text-slate-800">Settings</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 md:hidden"
              aria-label="Close settings"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex justify-center space-x-2 overflow-x-auto pb-2 md:justify-start md:pb-0 md:flex-col md:space-x-0 md:space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab(UserSettingTab.PROFILE)}
              className={cn(
                `flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-bold ${
                  activeTab === UserSettingTab.PROFILE
                    ? "text-white bg-[var(--color-primary-dark)] shadow-sm"
                    : "text-slate-600 hover:bg-slate-300/70"
                }`,
              )}
            >
              <User className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-bold md:text-sm">Account</span>
            </button>
            <button
              onClick={() => setActiveTab(UserSettingTab.GENERAL)}
              className={cn(
                `flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-bold ${
                  activeTab === UserSettingTab.GENERAL
                    ? "text-white bg-[var(--color-primary-dark)] shadow-sm"
                    : "text-slate-600 hover:bg-slate-300/70"
                }`,
              )}
            >
              <Settings className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-bold md:text-sm">Preferences</span>
            </button>
            <button
              onClick={() => setActiveTab(UserSettingTab.SESSION)}
              className={cn(
                `flex min-w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-bold ${
                  activeTab === UserSettingTab.SESSION
                    ? "text-white bg-[var(--color-primary-dark)] shadow-sm"
                    : "text-slate-600 hover:bg-slate-300/70"
                }`,
              )}
            >
              <Shield className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-bold md:text-sm">Security</span>
            </button>
            <button
              onClick={() => setActiveTab(UserSettingTab.PASSWORD)}
              className={cn(
                `relative flex min-w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-bold ${
                  activeTab === UserSettingTab.PASSWORD
                    ? "text-white bg-[var(--color-primary-dark)] shadow-sm"
                    : "text-slate-600 hover:bg-slate-300/70"
                }`,
              )}
            >
              <span className="relative">
                <KeyRound className="h-5 w-5 md:h-4 md:w-4" />
                {!hasPassword && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </span>
              <span className="text-xs font-bold md:text-sm">Password</span>
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:block cursor-pointer"
            aria-label="Close settings"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto max-w-2xl mt-4">
            {activeTab === UserSettingTab.PROFILE && <ProfileTab />}
            {activeTab === UserSettingTab.GENERAL && <SettingsTab />}
            {activeTab === UserSettingTab.SESSION && <SessionsTab />}
            {activeTab === UserSettingTab.PASSWORD && <PasswordTab />}
          </div>
        </div>
      </div>
    </div>
  );
});

export default UserSettingsModal;
