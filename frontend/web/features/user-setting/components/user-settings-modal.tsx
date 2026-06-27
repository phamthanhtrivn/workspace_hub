"use client";

import { useState } from "react";
import { X, User, Settings, Shield } from "lucide-react";
import ProfileTab from "./profile-tab";
import SettingsTab from "./settings-tab";
import SessionsTab from "./sessions-tab";

type UserSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UserSettingsModal({
  isOpen,
  onClose,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "settings" | "sessions"
  >("profile");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm transition-opacity">
      <div className="flex h-full max-h-[550px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 md:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full border-b border-slate-100 bg-slate-50 p-4 md:w-56 md:border-b-0 md:border-r">
          <div className="mb-6 flex items-center justify-between md:mb-8">
            <h2 className="text-lg font-black text-slate-800">Cài Đặt</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex justify-center space-x-2 overflow-x-auto pb-2 md:justify-start md:pb-0 md:flex-col md:space-x-0 md:space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-bold ${
                activeTab === "profile"
                  ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              <User className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-bold md:text-sm">Tài khoản</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex min-w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-bold ${
                activeTab === "settings"
                  ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              <Settings className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-bold md:text-sm">Tùy chỉnh</span>
            </button>
            <button
              onClick={() => setActiveTab("sessions")}
              className={`flex min-w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 transition-colors cursor-pointer md:min-w-0 md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm md:font-bold ${
                activeTab === "sessions"
                  ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/50"
              }`}
            >
              <Shield className="h-5 w-5 md:h-4 md:w-4" />
              <span className="text-xs font-bold md:text-sm">Bảo mật</span>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 hidden rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:block cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto max-w-2xl mt-4">
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "settings" && <SettingsTab />}
            {activeTab === "sessions" && <SessionsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
