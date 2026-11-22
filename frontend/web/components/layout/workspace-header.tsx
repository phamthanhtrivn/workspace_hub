"use client";

import React from "react";
import { ChevronLeft, ChevronRight, CircleHelp, Menu } from "lucide-react";
import { useWorkspaceHelp } from "@/features/help/hooks/use-workspace-help";
import NotificationDropdown from "@/components/common/notification-dropdown";
import UserProfileDropdown from "../common/user-profile-dropdown";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { useNotificationSocket } from "@/features/notification/hooks/useNotificationSocket";
import { useChatSocket } from "@/features/chat/hooks/socket/useChatSocket";
import { Button } from "@/components/ui/button";
import { WorkspaceClock } from "./workspace-clock";

interface WorkspaceHeaderProps {
  currentTitle: string;
  navigationOpen: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onMenuClick: () => void;
  onOpenSettings: (tab: UserSettingTab) => void;
}

const WorkspaceHeader = React.memo(function WorkspaceHeader({
  currentTitle,
  navigationOpen,
  sidebarCollapsed,
  onToggleSidebar,
  onMenuClick,
  onOpenSettings,
}: WorkspaceHeaderProps) {
  useNotificationSocket();
  useChatSocket();
  const { openHelp } = useWorkspaceHelp();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3.5 sm:px-6 lg:px-8">
      <div className="flex w-full items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Mobile Menu */}
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            aria-expanded={navigationOpen}
            aria-controls="workspace-navigation"
            onClick={onMenuClick}
            className="size-9 shrink-0 rounded-xl border-border bg-card text-muted-foreground hover:bg-info-soft hover:text-info-content lg:hidden"
          >
            <Menu aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={
              sidebarCollapsed ? "Expand navigation" : "Collapse navigation"
            }
            aria-expanded={!sidebarCollapsed}
            aria-controls="workspace-navigation"
            title={
              sidebarCollapsed ? "Expand navigation" : "Collapse navigation"
            }
            onClick={onToggleSidebar}
            className="hidden size-9 shrink-0 rounded-xl border-border bg-card text-muted-foreground hover:bg-info-soft hover:text-info-content lg:inline-flex"
          >
            {sidebarCollapsed ? (
              <ChevronRight aria-hidden="true" />
            ) : (
              <ChevronLeft aria-hidden="true" />
            )}
          </Button>
          <div className="min-w-0">
            <nav
              aria-label="Breadcrumb"
              className="mb-0.5 hidden min-w-0 sm:block"
            >
              <ol className="flex min-w-0 items-center gap-1.5 text-xs leading-4 text-muted-foreground">
                <li>Workspace</li>
                <li aria-hidden="true">
                  <ChevronRight className="size-3" />
                </li>
                <li
                  aria-current="page"
                  className="min-w-0 truncate font-medium text-info-content"
                >
                  {currentTitle}
                </li>
              </ol>
            </nav>
            <h2 className="truncate text-section-title font-semibold text-foreground">
              {currentTitle}
            </h2>
          </div>
        </div>

        {/* Right: Actions & User Profile */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <WorkspaceClock
            onOpenSettings={() => onOpenSettings(UserSettingTab.GENERAL)}
          />
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 sm:border-l sm:border-border sm:pl-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Open Help & shortcuts"
              aria-keyshortcuts="?"
              title="Help & shortcuts (?)"
              onClick={openHelp}
              className="size-9 shrink-0 rounded-xl border-border bg-card text-muted-foreground hover:bg-info-soft hover:text-info-content"
            >
              <CircleHelp aria-hidden="true" />
            </Button>
            <NotificationDropdown />
          </div>
          <div className="shrink-0 sm:border-l sm:border-border sm:pl-3">
            <UserProfileDropdown onOpenSettings={onOpenSettings} />
          </div>
        </div>
      </div>
    </header>
  );
});

export default WorkspaceHeader;
