"use client";

import { FeatureSidebarItem } from "@/components/common/feature-sidebar-item";
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
    <aside className="flex min-h-0 min-w-0 shrink-0 flex-col border-b border-border bg-sidebar px-4 py-4 @min-[1120px]/meetings:w-80 @min-[1120px]/meetings:border-b-0 @min-[1120px]/meetings:border-r @min-[1120px]/meetings:py-6">
      <div
        className="flex min-h-0 min-w-0 flex-col gap-5 overflow-auto overscroll-contain @min-[1120px]/meetings:flex-1"
        role="region"
        aria-label="Meeting sidebar"
        tabIndex={0}
      >
        <nav
          className="flex w-max min-w-full shrink-0 gap-1.5 pb-2 @min-[1120px]/meetings:w-full @min-[1120px]/meetings:flex-col @min-[1120px]/meetings:pb-0"
          aria-label="Meeting dashboard"
        >
          {meetingDashboardNavItems.map((item) => (
            <FeatureSidebarItem
              key={item.id}
              icon={meetingNavIconById[item.id]}
              label={item.label}
              active={item.id === activeItemId}
              disabled={!enabledMeetingNavItems.has(item.id)}
              onClick={() => onItemSelect(item.id)}
            />
          ))}
        </nav>

        <MeetingSidebarStatsPanel />
      </div>
    </aside>
  );
}
