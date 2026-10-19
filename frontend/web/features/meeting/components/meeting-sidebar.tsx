"use client";

import { cn } from "@/lib/utils";
import {
  MeetingDashboardNavItemId,
  meetingDashboardNavItems,
  meetingNavIconById,
} from "../types/meeting.constants";
import { MeetingSidebarStatsPanel } from "./meeting-sidebar-stats-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";


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
    <aside className="flex min-h-0 min-w-0 shrink-0 flex-col border-b border-border bg-sidebar px-4 py-4 @min-[1120px]/meetings:w-80 @min-[1120px]/meetings:border-b-0 @min-[1120px]/meetings:border-r @min-[1120px]/meetings:py-6">
      <ScrollArea scrollbars="both" className="@min-[1120px]/meetings:flex-1" viewportClassName="h-auto @min-[1120px]/meetings:h-full" contentClassName="flex min-h-full flex-col gap-5" viewportProps={{ role: "region", "aria-label": "Meeting sidebar" }}>
      <nav
        className="flex w-max min-w-full gap-2 pb-2 @min-[1120px]/meetings:w-full @min-[1120px]/meetings:flex-col @min-[1120px]/meetings:pb-0"
        aria-label="Meeting dashboard"
      >
        {meetingDashboardNavItems.map((item) => {
          const Icon = meetingNavIconById[item.id];
          const isActive = item.id === activeItemId;
          const isEnabled = enabledMeetingNavItems.has(item.id);

          return (
            <Button variant="unstyled"
              key={item.id}
              type="button"
              disabled={!isEnabled}
              onClick={() => onItemSelect(item.id)}
              className={cn(
                "cursor-pointer flex h-12 shrink-0 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isActive
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center",
                  isActive ? "text-primary-soft-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="whitespace-nowrap">
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>

      <MeetingSidebarStatsPanel />
      </ScrollArea>
    </aside>
  );
}
