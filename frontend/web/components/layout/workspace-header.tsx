"use client";

import { useEffect, useRef } from "react";
import { Menu, Search } from "lucide-react";
import NotificationDropdown from "@/components/common/notification-dropdown";
import UserProfileDropdown from "../common/user-profile-dropdown";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { notificationSocketService } from "@/features/notification/api/notification-socket.service";
import { addNotification } from "@/store/notification/notification.slice";

interface WorkspaceHeaderProps {
  currentTitle: string;
  onMenuClick: () => void;
  onOpenSettings: (tab: "profile" | "settings" | "sessions") => void;
}

export default function WorkspaceHeader({
  currentTitle,
  onMenuClick,
  onOpenSettings,
}: WorkspaceHeaderProps) {
  const { accessToken } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const notificationConnectedRef = useRef(false);

  useEffect(() => {
    if (!accessToken || notificationConnectedRef.current) return;

    notificationSocketService.connect(accessToken);
    notificationConnectedRef.current = true;

    const socket = notificationSocketService.getSocket();
    if (socket) {
      socket.on("new_notification", (noti: any) => {
        dispatch(addNotification(noti));
      });
    }
  }, [accessToken, dispatch]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-gray-50 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
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
          <NotificationDropdown />
          <UserProfileDropdown onOpenSettings={onOpenSettings} />
        </div>
      </div>
    </header>
  );
}
