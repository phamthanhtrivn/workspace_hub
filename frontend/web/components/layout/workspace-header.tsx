"use client";

import React from "react";
import { Menu, Search } from "lucide-react";
import NotificationDropdown from "@/components/common/notification-dropdown";
import UserProfileDropdown from "../common/user-profile-dropdown";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { useNotificationSocket } from "@/features/notification/hooks/useNotificationSocket";

interface WorkspaceHeaderProps {
  currentTitle: string;
  onMenuClick: () => void;
  onOpenSettings: (tab: UserSettingTab) => void;
}

const WorkspaceHeader = React.memo(function WorkspaceHeader({
  currentTitle,
  onMenuClick,
  onOpenSettings,
}: WorkspaceHeaderProps) {
  useNotificationSocket();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 py-3.5 backdrop-blur-xl px-4 sm:px-6 lg:px-8">
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Mobile Menu */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="-ml-2 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <div className="hidden sm:flex items-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
              <span>Workspace</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="truncate">{currentTitle}</span>
            </div>
            <h2 className="truncate text-lg sm:text-xl font-black text-[var(--color-primary-dark)]">
              {currentTitle}
            </h2>
          </div>
        </div>

        {/* Middle: Search Bar (Desktop) & Search Button (Tablet) */}
        <div className="hidden lg:flex flex-1 max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm transition hover:border-slate-300 cursor-text">
          <Search className="h-4 w-4" strokeWidth={2} />
          <span className="flex-1 text-left">Search workspace...</span>
          <div className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-400">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>

        <button className="hidden sm:flex lg:hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-700 hover:border-slate-300 cursor-pointer">
          <Search className="h-5 w-5" strokeWidth={2} />
        </button>

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationDropdown />
          <UserProfileDropdown onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </header>
  );
});

export default WorkspaceHeader;
