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
    <header className="sticky top-0 z-40 border-b border-border bg-card py-3.5 px-4 sm:px-6 lg:px-8">
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Mobile Menu */}
        <div className="flex min-w-0 items-center gap-3">
          <button aria-label="Open navigation"
            onClick={onMenuClick}
            className="-ml-2 rounded-control p-2 text-muted-foreground hover:bg-muted lg:hidden cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <div className="hidden sm:flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span>Workspace</span>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="truncate">{currentTitle}</span>
            </div>
            <h2 className="truncate text-section-title sm:text-section-title font-semibold text-foreground">
              {currentTitle}
            </h2>
          </div>
        </div>

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
