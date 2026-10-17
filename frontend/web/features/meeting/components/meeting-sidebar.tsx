"use client";

import { cn } from "@/lib/utils";
import {
  MeetingDashboardNavItemId,
  meetingDashboardNavItems,
  meetingNavIconById,
} from "../types/meeting.constants";
import { MeetingSidebarStatsPanel } from "./meeting-sidebar-stats-panel";

interface MeetingSidebarProps {
  activeItemId: MeetingDashboardNavItemId;
  onItemSelect: (itemId: MeetingDashboardNavItemId) => void;
}

const enabledMeetingNavItems = new Set<MeetingDashboardNavItemId>([
  MeetingDashboardNavItemId.OVERVIEW,
  MeetingDashboardNavItemId.UPCOMING,
  MeetingDashboardNavItemId.PREVIOUS,
  MeetingDashboardNavItemId.RECORDINGS,
]);

export function MeetingSidebar({
  activeItemId,
  onItemSelect,
}: MeetingSidebarProps) {
  return (
    <aside className="flex shrink-0 flex-col gap-5 border-b border-border bg-card px-4 py-4 xl:w-80 xl:border-b-0 xl:border-r xl:py-6">
      <nav
        className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible"
        aria-label="Meeting dashboard"
      >
        {meetingDashboardNavItems.map((item) => {
          const Icon = meetingNavIconById[item.id];
          const isActive = item.id === activeItemId;
          const isEnabled = enabledMeetingNavItems.has(item.id);

          return (
            <button
              key={item.id}
              type="button"
              disabled={!isEnabled}
              onClick={() => onItemSelect(item.id)}
              className={cn(
                "cursor-pointer flex h-12 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                  isActive ? "bg-overlay/10" : "bg-background text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <MeetingSidebarStatsPanel />
    </aside>
  );
}
