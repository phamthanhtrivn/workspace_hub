"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { MeetingDashboardNavItemId, meetingDashboardNavItems, meetingNavIconById } from "../../types/meeting.constants";

export function MeetingSidebar() {
  const intl = useAppIntl();

  return (
    <aside className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-4 shadow-[0_12px_32px_rgba(15,40,84,0.06)] xl:w-60 xl:border-b-0 xl:border-r xl:py-6">
      <nav
        className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible"
        aria-label={intl.formatMessage({
          id: "meeting.dashboard.navLabel",
        })}
      >
        {meetingDashboardNavItems.map((item) => {
          const Icon = meetingNavIconById[item.id];
          const isActive = item.id === MeetingDashboardNavItemId.OVERVIEW;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!isActive}
              className={cn(
                "flex h-12 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]",
                isActive
                  ? "bg-[#0052CC] text-white shadow-[0_12px_28px_rgba(0,82,204,0.22)]"
                  : "text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                  isActive ? "bg-white/16" : "bg-slate-50 text-slate-500",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap">
                {intl.formatMessage({ id: item.labelId })}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
