"use client";

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
} from "lucide-react";

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

  return (
    <div className="min-h-dvh bg-[#f5f9fb] text-[var(--color-primary-dark)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/80 bg-white/90 px-4 py-5 shadow-[18px_0_48px_rgba(15,40,84,0.06)] backdrop-blur-xl lg:block">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--color-primary-dark)] text-sm font-black text-white shadow-[0_14px_28px_rgba(15,40,84,0.22)]">
            WH
          </span>
          <span>
            <span className="block text-base font-black leading-tight">
              WorkspaceHub
            </span>
            <span className="block text-xs font-semibold text-slate-500">
              Intelligent workspace
            </span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1.5" aria-label="Workspace menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20",
                  isActive
                    ? "bg-[var(--color-primary-dark)] text-white shadow-[0_16px_34px_rgba(15,40,84,0.18)]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[var(--color-primary-dark)]",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className={[
                    "grid h-9 w-9 place-items-center rounded-xl transition",
                    isActive
                      ? "bg-white/14 text-white"
                      : "bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 group-hover:text-[var(--color-primary)]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block leading-tight">{item.label}</span>
                  <span
                    className={[
                      "block text-xs font-semibold leading-tight",
                      isActive ? "text-blue-100" : "text-slate-400",
                    ].join(" ")}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-4 bottom-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[var(--color-primary)] shadow-sm ring-1 ring-slate-200">
              <Settings className="h-4 w-4" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-black">Workspace Settings</p>
              <p className="text-xs font-semibold text-slate-500">
                Hồ sơ và nhóm
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f5f9fb]/86 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
                Workspace
              </p>
              <h2 className="truncate text-xl font-black text-[var(--color-primary-dark)]">
                {currentTitle}
              </h2>
            </div>

            <div className="hidden min-w-[18rem] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm md:flex">
              <Search className="h-4 w-4" strokeWidth={2} />
              Search workspace
            </div>

            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-[var(--color-primary-dark)] shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20"
              aria-label="Open profile"
            >
              TT
            </button>
          </div>

          <nav
            className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden"
            aria-label="Workspace mobile menu"
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20",
                    isActive
                      ? "bg-[var(--color-primary-dark)] text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
