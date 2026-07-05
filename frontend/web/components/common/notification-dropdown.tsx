"use client";

import { Bell } from "lucide-react";

export default function NotificationDropdown() {
  return (
    <div className="relative">
      <button
        className="relative flex z-100 h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-secondary)]/20 cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={22} />
      </button>
    </div>
  );
}
