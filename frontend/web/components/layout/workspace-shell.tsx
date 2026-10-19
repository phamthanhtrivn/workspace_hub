"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Files,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Video,
  X,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import UserSettingsModal from "@/features/user-setting/components/user-settings-modal";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { cn } from "@/lib/utils";
import WorkspaceHeader from "./workspace-header";
import { PomodoroMiniTimer } from "@/features/pomodoro/components/pomodoro-mini-timer";
import { Button } from "@/components/ui/button";
import { SheetPanel } from "@/components/ui/sheet";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";


const menuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview & Analytics",
    icon: LayoutDashboard,
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Tasks & Workflows",
    icon: FolderKanban,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Events & Schedules",
    icon: CalendarDays,
  },
  {
    href: "/pomodoro",
    label: "Pomodoro",
    description: "Focus & Time Tracker",
    icon: Clock3,
  },
  {
    href: "/chat",
    label: "Messages",
    description: "Team Channels & DMs",
    icon: MessageSquareText,
  },
  {
    href: "/meetings",
    label: "Meetings",
    description: "Video Calls & Rooms",
    icon: Video,
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Notes & File Storage",
    icon: Files,
  },
  {
    href: "/ai",
    label: "AI Assistant",
    description: "Coming soon",
    icon: Bot,
  },
];

function isWorkspaceRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const WorkspaceShell = React.memo(function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const currentItem = menuItems.find((item) =>
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
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      {isMobileMenuOpen && (
        <div data-ui-interaction-exception="Backdrop dismissal; close button and Escape are available."
          className="fixed inset-0 z-40 bg-overlay/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation"
        />
      )}

      <SheetPanel id="workspace-navigation" aria-label="Workspace navigation" open={isDesktop || isMobileMenuOpen} modal={!isDesktop} onClose={() => setIsMobileMenuOpen(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar px-4 py-5 transition-all duration-200 ease-in-out lg:relative lg:flex shadow-dialog",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
          isSidebarCollapsed ? "lg:w-24" : "lg:w-72",
          "w-72 shrink-0",
        )}
      >
        <Button variant="unstyled"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          className="absolute -right-3 top-8 z-100 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-muted-foreground hover:shadow lg:flex cursor-pointer shadow-panel"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className={cn(
              "flex min-w-0 items-center rounded-panel p-2 transition hover:bg-background focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
              isSidebarCollapsed ? "lg:mx-auto" : "",
            )}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-panel bg-brand-blue text-sm font-semibold text-brand-ice transition-all">
              W
            </span>
            <div
              className={cn(
                "transition-all duration-200 ease-in-out overflow-hidden",
                isSidebarCollapsed
                  ? "lg:w-0 lg:opacity-0"
                  : "w-auto lg:w-48 opacity-100",
              )}
            >
              <div className="pl-3 whitespace-nowrap">
                <span className="block text-base font-semibold leading-tight">
                  WorkspaceHub
                </span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  Your workspace
                </span>
              </div>
            </div>
          </Link>

          <Button variant="unstyled" aria-label="Close"
            onClick={() => setIsMobileMenuOpen(false)}
            className="shrink-0 p-2 text-muted-foreground hover:text-foreground lg:hidden cursor-pointer"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <nav
          className="mt-8 flex-1 space-y-1.5 overflow-y-auto pr-2 -mr-2"
          aria-label="Workspace navigation menu"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isWorkspaceRouteActive(pathname, item.href);
            const label = item.label;
            const description = item.description;

            return (
              <Tooltip key={item.href}><TooltipTrigger asChild><Link
                aria-label={item.href === "/ai" ? "AI Assistant — coming soon" : label}
                key={item.href}
                href={item.href}
                title={isSidebarCollapsed ? label : undefined}
                className={cn(
                  "group flex items-center rounded-panel p-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring relative",
                  isActive
                    ? "bg-primary-soft text-primary-soft-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isSidebarCollapsed ? "lg:justify-center" : "",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-panel transition relative",
                    isActive
                      ? "bg-transparent text-primary-soft-foreground"
                      : "bg-card text-muted-foreground group-hover:text-link",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div
                  className={cn(
                    "transition-all duration-200 ease-in-out overflow-hidden",
                    isSidebarCollapsed
                      ? "lg:w-0 lg:opacity-0"
                      : "w-auto lg:w-48 opacity-100",
                  )}
                >
                  <div className="pl-3 whitespace-nowrap">
                    <span className="block leading-tight">{label}</span>
                    <span
                      className={cn(
                        "block text-xs font-semibold leading-tight",
                        isActive ? "text-primary-soft-foreground" : "text-muted-foreground",
                      )}
                    >
                      {description}
                    </span>
                  </div>
                </div>
              </Link></TooltipTrigger>{isSidebarCollapsed && <TooltipContent>{label}{item.href === "/ai" ? " — coming soon" : ""}</TooltipContent>}</Tooltip>
            );
          })}
        </nav>

        <div className="mt-auto mb-2 pt-4">
          <Button variant="unstyled" type="button" aria-label="Open settings"
            onClick={() => handleOpenSettings(UserSettingTab.PROFILE)}
            className={cn(
              "w-full text-left rounded-panel border border-border bg-background p-4 transition-all duration-200 cursor-pointer hover:bg-muted",
              isSidebarCollapsed ? "lg:px-2 lg:flex lg:justify-center" : "",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                isSidebarCollapsed ? "lg:justify-center" : "",
              )}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-card text-link ring-1 ring-ring transition-all">
                <Settings className="h-4 w-4" strokeWidth={2} />
              </div>
              <div
                className={cn(
                  "transition-all duration-200 ease-in-out overflow-hidden",
                  isSidebarCollapsed
                    ? "lg:w-0 lg:opacity-0"
                    : "w-auto lg:w-48 opacity-100",
                )}
              >
                <div className="pl-3 whitespace-nowrap">
                  <p className="text-sm font-semibold text-foreground hover:text-foreground">
                    Settings
                  </p>
                  <p className="truncate text-[0.7rem] font-semibold text-muted-foreground">
                    {email}
                  </p>
                </div>
              </div>
            </div>
          </Button>
        </div>
      </SheetPanel>

      <div inert={!isDesktop && isMobileMenuOpen ? true : undefined} className="flex flex-1 flex-col min-w-0 bg-background text-foreground">
        <WorkspaceHeader
          navigationOpen={isMobileMenuOpen}
          currentTitle={currentTitle}
          onMenuClick={handleMenuClick}
          onOpenSettings={handleOpenSettings}
        />

        <PomodoroMiniTimer />
        <main
          className={cn(
            "flex-1",
            pathname === "/projects" ||
              pathname.startsWith("/chat") ||
              pathname.startsWith("/documents") ||
              pathname.startsWith("/meetings") ||
              pathname.startsWith("/calendar")
              ? "overflow-hidden"
              : "overflow-y-auto",
            "relative flex min-h-0 min-w-0 flex-col",
          )}
        >
          <div className="flex-1 min-h-0 min-w-0 w-full h-full flex flex-col">{children}</div>
        </main>
      </div>

      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettings}
        initialTab={activeSettingsTab}
      />
    </div>
  );
});

export default WorkspaceShell;
