"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  CheckSquare,
  Clock3,
  Files,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import UserSettingsModal from "@/features/user-setting/components/user-settings-modal";
import WorkspaceHeader from "./workspace-header";

const menuItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: "/projects",
    label: "Projects",
    description: "Dự án",
    icon: FolderKanban,
  },
  {
    href: "/tasks",
    label: "Tasks",
    description: "Công việc",
    icon: CheckSquare,
  },
  {
    href: "/chat",
    label: "Chat",
    description: "Trao đổi",
    icon: MessageSquareText,
  },
  {
    href: "/calendar",
    label: "Calendar",
    description: "Lịch trình",
    icon: CalendarDays,
  },
  {
    href: "/documents",
    label: "Documents",
    description: "Tài liệu",
    icon: Files,
  },
  {
    href: "/pomodoro",
    label: "Pomodoro",
    description: "Tập trung",
    icon: Clock3,
  },
  {
    href: "/ai",
    label: "AI",
    description: "Trợ lý",
    icon: Bot,
  },
];

const pageTitles = new Map(menuItems.map((item) => [item.href, item.label]));

export default function WorkspaceShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentTitle = pageTitles.get(pathname) ?? "Workspace";

  console.log(currentTitle);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { email } = useAppSelector((state) => state.auth);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f9fb] text-[var(--color-primary-dark)]">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white/90 px-4 py-5 shadow-[18px_0_48px_rgba(15,40,84,0.06)] backdrop-blur-xl transition-all duration-300 ease-in-out lg:relative lg:flex",
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
          isSidebarCollapsed ? "lg:w-24" : "lg:w-72",
          "w-72 shrink-0", // Mobile width is always 72, shrink-0 prevents it from shrinking
        ].join(" ")}
      >
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-8 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:text-slate-600 hover:shadow lg:flex cursor-pointer"
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
            className={[
              "flex min-w-0 items-center rounded-2xl p-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20",
              isSidebarCollapsed ? "lg:mx-auto" : "",
            ].join(" ")}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-dark)] text-sm font-black text-white shadow-[0_14px_28px_rgba(15,40,84,0.22)] transition-all">
              W
            </span>
            <div
              className={[
                "transition-all duration-300 ease-in-out overflow-hidden",
                isSidebarCollapsed
                  ? "lg:w-0 lg:opacity-0"
                  : "w-auto lg:w-48 opacity-100",
              ].join(" ")}
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
                className={[
                  "group flex items-center rounded-2xl p-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20",
                  isActive
                    ? "bg-[var(--color-primary-dark)] text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary-dark)]",
                  isSidebarCollapsed ? "lg:justify-center" : "",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={[
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition",
                    isActive
                      ? "bg-white/14 text-white"
                      : "bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 group-hover:text-[var(--color-primary)]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div
                  className={[
                    "transition-all duration-300 ease-in-out overflow-hidden",
                    isSidebarCollapsed
                      ? "lg:w-0 lg:opacity-0"
                      : "w-auto lg:w-48 opacity-100",
                  ].join(" ")}
                >
                  <div className="pl-3 whitespace-nowrap">
                    <span className="block leading-tight">{item.label}</span>
                    <span
                      className={[
                        "block text-xs font-semibold leading-tight",
                        isActive ? "text-blue-100" : "text-slate-400",
                      ].join(" ")}
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
            onClick={() => setIsSettingsModalOpen(true)}
            className={[
              "rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300 cursor-pointer hover:bg-slate-100",
              isSidebarCollapsed ? "lg:px-2 lg:flex lg:justify-center" : "",
            ].join(" ")}
          >
            <div
              className={[
                "flex items-center",
                isSidebarCollapsed ? "lg:justify-center" : "",
              ].join(" ")}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-slate-200 transition-all">
                <Settings className="h-4 w-4" strokeWidth={2} />
              </div>
              <div
                className={[
                  "transition-all duration-300 ease-in-out overflow-hidden",
                  isSidebarCollapsed
                    ? "lg:w-0 lg:opacity-0"
                    : "w-auto lg:w-48 opacity-100",
                ].join(" ")}
              >
                <div className="pl-3 whitespace-nowrap">
                  <p className="text-sm font-black text-slate-800 hover:text-[var(--color-primary-dark)]">
                    Cài đặt chung
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

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 bg-background text-foreground">
        <WorkspaceHeader
          currentTitle={currentTitle}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
