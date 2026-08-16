"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Files,
  FolderKanban,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Settings,
  X,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import UserSettingsModal from "@/features/user-setting/components/user-settings-modal";
import { UserSettingTab } from "@/features/user-setting/types/settings.enums";
import { cn } from "@/lib/utils";
import WorkspaceHeader from "./workspace-header";

const menuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Projects",
    icon: FolderKanban,
  },
  {
    href: "/invitations",
    label: "Invitations",
    description: "Invites",
    icon: Mail,
  },
  {
    href: "/tasks",
    label: "Tasks",
    description: "Work",
    icon: CheckSquare,
  },
  {
    href: "/chat",
    label: "Chat",
    description: "Messages",
    icon: MessageSquareText,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Schedule",
    icon: CalendarDays,
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Files",
    icon: Files,
  },
  {
    href: "/pomodoro",
    label: "Pomodoro",
    description: "Focus",
    icon: Clock3,
  },
  {
    href: "/ai",
    label: "AI",
    description: "Assistant",
    icon: Bot,
  },
];

const pageTitles = new Map(menuItems.map((item) => [item.href, item.label]));

const WorkspaceShell = React.memo(function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentTitle = pageTitles.get(pathname) ?? "Workspace";

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
    setActiveSettingsTab(tab);
    setIsSettingsModalOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f9fb] text-[var(--color-primary-dark)]">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white/90 px-4 py-5 shadow-[18px_0_48px_rgba(15,40,84,0.06)] backdrop-blur-xl transition-all duration-300 ease-in-out lg:relative lg:flex",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
          isSidebarCollapsed ? "lg:w-24" : "lg:w-72",
          "w-72 shrink-0",
        )}
      >
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-8 z-100 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:text-slate-600 hover:shadow lg:flex cursor-pointer"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className={cn(
              "flex min-w-0 items-center rounded-2xl p-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20",
              isSidebarCollapsed ? "lg:mx-auto" : "",
            )}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-dark)] text-sm font-black text-white shadow-[0_14px_28px_rgba(15,40,84,0.22)] transition-all">
              W
            </span>
            <div
              className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden",
                isSidebarCollapsed
                  ? "lg:w-0 lg:opacity-0"
                  : "w-auto lg:w-48 opacity-100",
              )}
            >
              <div className="pl-3 whitespace-nowrap">
                <span className="block text-base font-black leading-tight">
                  WorkspaceHub
                </span>
                <span className="block text-xs font-semibold text-slate-500">
                  Intelligent workspace
                </span>
              </div>
            </div>
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="shrink-0 p-2 text-slate-500 hover:text-slate-700 lg:hidden cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav
          className="mt-8 flex-1 space-y-1.5 overflow-y-auto pr-2 -mr-2"
          aria-label="Workspace menu"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center rounded-2xl p-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 relative",
                  isActive
                    ? "bg-[var(--color-primary-dark)] text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary-dark)]",
                  isSidebarCollapsed ? "lg:justify-center" : "",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition relative",
                    isActive
                      ? "bg-white/14 text-white"
                      : "bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 group-hover:text-[var(--color-primary)]",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div
                  className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isSidebarCollapsed
                      ? "lg:w-0 lg:opacity-0"
                      : "w-auto lg:w-48 opacity-100",
                  )}
                >
                  <div className="pl-3 whitespace-nowrap">
                    <span className="block leading-tight">{item.label}</span>
                    <span
                      className={cn(
                        "block text-xs font-semibold leading-tight",
                        isActive ? "text-blue-100" : "text-slate-400",
                      )}
                    >
                      {item.description}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto mb-2 pt-4">
          <div
            onClick={() => {
              setActiveSettingsTab(UserSettingTab.GENERAL);
              setIsSettingsModalOpen(true);
            }}
            className={cn(
              "rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300 cursor-pointer hover:bg-slate-100",
              isSidebarCollapsed ? "lg:px-2 lg:flex lg:justify-center" : "",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                isSidebarCollapsed ? "lg:justify-center" : "",
              )}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-slate-200 transition-all">
                <Settings className="h-4 w-4" strokeWidth={2} />
              </div>
              <div
                className={cn(
                  "transition-all duration-300 ease-in-out overflow-hidden",
                  isSidebarCollapsed
                    ? "lg:w-0 lg:opacity-0"
                    : "w-auto lg:w-48 opacity-100",
                )}
              >
                <div className="pl-3 whitespace-nowrap">
                  <p className="text-sm font-black text-slate-800 hover:text-[var(--color-primary-dark)]">
                    General settings
                  </p>
                  <p className="truncate text-[0.7rem] font-semibold text-slate-500">
                    {email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 bg-background text-foreground">
        <WorkspaceHeader
          currentTitle={currentTitle}
          onMenuClick={handleMenuClick}
          onOpenSettings={handleOpenSettings}
        />

        <main
          className={cn(
            "flex-1",
            pathname.startsWith("/chat")
              ? "overflow-hidden"
              : "overflow-y-auto",
            "relative flex flex-col",
          )}
        >
          <div className="flex-1 w-full h-full flex flex-col">{children}</div>
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
