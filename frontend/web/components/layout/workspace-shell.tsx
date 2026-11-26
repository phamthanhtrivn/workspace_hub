"use client";

import React, { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/store";
import UserSettingsModal from "@/features/user-setting/components/user-settings-modal";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { OpenUserSettingsContext } from "@/features/user-setting/hooks/use-open-user-settings";
import { cn } from "@/lib/utils";
import WorkspaceHeader from "./workspace-header";
import WorkAssistantLauncher from "@/features/work-assistant/components/work-assistant-launcher";
import { PomodoroMiniTimer } from "@/features/pomodoro/components/pomodoro-mini-timer";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { WorkspaceHelpProvider } from "@/features/help/components/workspace-help-provider";

import { WorkspaceSidebar } from "./workspace-sidebar";
import {
  isWorkspaceRouteActive,
  WORKSPACE_NAVIGATION_ITEMS,
} from "./workspace-navigation";

const WorkspaceShell = React.memo(function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const currentItem = WORKSPACE_NAVIGATION_ITEMS.find((item) =>
    isWorkspaceRouteActive(pathname, item.href),
  );
  const currentTitle = currentItem ? currentItem.label : "Workspace";

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<UserSettingTab>(
    UserSettingTab.PROFILE,
  );

  const { email } = useAppSelector((state) => state.auth);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const storedState = localStorage.getItem("isSidebarCollapsed");
    if (storedState !== null) {
      setIsSidebarCollapsed(storedState === "true");
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem("isSidebarCollapsed", String(nextState));
      return nextState;
    });
  }, []);

  const handleMenuClick = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const handleOpenSettings = useCallback((tab: UserSettingTab) => {
    setIsMobileMenuOpen(false);
    setActiveSettingsTab(tab);
    setIsSettingsModalOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  return (
    <OpenUserSettingsContext.Provider value={handleOpenSettings}>
      <WorkspaceHelpProvider>
        <div className="flex h-dvh overflow-hidden bg-background text-foreground">
          {isMobileMenuOpen && (
            <div
              data-ui-interaction-exception="Backdrop dismissal; close button and Escape are available."
              className="fixed inset-0 z-40 bg-overlay/50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation"
            />
          )}

          <WorkspaceSidebar
            pathname={pathname}
            email={email}
            desktop={isDesktop}
            mobileOpen={isMobileMenuOpen}
            collapsed={isSidebarCollapsed}
            onClose={() => setIsMobileMenuOpen(false)}
            onOpenSettings={() => handleOpenSettings(UserSettingTab.PROFILE)}
          />

          <div
            inert={!isDesktop && isMobileMenuOpen ? true : undefined}
            className="flex min-w-0 flex-1 flex-col bg-background text-foreground"
          >
            <WorkspaceHeader
              navigationOpen={isMobileMenuOpen}
              sidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={toggleSidebar}
              currentTitle={currentTitle}
              onMenuClick={handleMenuClick}
              onOpenSettings={handleOpenSettings}
            />

            <PomodoroMiniTimer />
            <main
              className={cn(
                "flex-1 bg-background",
                pathname === "/projects" ||
                  pathname.startsWith("/chat") ||
                  pathname.startsWith("/documents") ||
                  pathname.startsWith("/meetings") ||
                  pathname.startsWith("/calendar") ||
                  pathname.startsWith("/ai/notebooks")
                  ? "overflow-hidden"
                  : "overflow-y-auto",
                "relative flex min-h-0 min-w-0 flex-col",
              )}
            >
              <div className="flex-1 min-h-0 min-w-0 w-full h-full flex flex-col">
                {children}
              </div>
            </main>
          </div>

          <WorkAssistantLauncher />
          <UserSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={handleCloseSettings}
            initialTab={activeSettingsTab}
          />
        </div>
      </WorkspaceHelpProvider>
    </OpenUserSettingsContext.Provider>
  );
});

export default WorkspaceShell;
