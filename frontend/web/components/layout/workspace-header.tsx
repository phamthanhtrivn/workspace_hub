"use client";

import { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, Plus, Settings, LogOut, User } from "lucide-react";

interface WorkspaceHeaderProps {
  currentTitle: string;
  onMenuClick: () => void;
}

export default function WorkspaceHeader({
  currentTitle,
  onMenuClick,
}: WorkspaceHeaderProps) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-background/86 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Left: Breadcrumbs & Mobile Menu */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            className="-ml-2 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">
              <span>Workspace</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="truncate">{currentTitle}</span>
            </div>
            <h2 className="truncate text-xl font-black text-[var(--color-primary-dark)]">
              {currentTitle}
            </h2>
          </div>
        </div>

        {/* Middle: Search Bar */}
        <div className="hidden flex-1 max-w-md items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-400 shadow-sm transition hover:border-slate-300 md:flex cursor-text">
          <Search className="h-4 w-4" strokeWidth={2} />
          <span className="flex-1 text-left">Search workspace...</span>
          <div className="flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-400">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>

        {/* Right: Actions & User Profile */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Notifications Button */}
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-[var(--color-primary-dark)] shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
              aria-label="Open user menu"
            >
              TT
            </button>

            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-800">Trí Thanh</p>
                  <p className="text-xs font-semibold text-slate-500 truncate">
                    thanh.tri@example.com
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer">
                    <User className="h-4 w-4" />
                    Hồ sơ cá nhân
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[var(--color-primary-dark)] transition cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Cài đặt chung
                  </button>
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer mt-1">
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
