"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PanelLeftClose, PanelLeftOpen, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/store";
import { recordingApi } from "../api/meeting-recording.api";
import { useMeetingHistorySummary } from "../hooks/useMeetingHistory";
import {
  MeetingDashboardNavItemId,
  meetingDashboardNavItems,
  meetingNavIconById,
} from "../types/meeting.constants";
import { MeetingSidebarStatsPanel } from "./meeting-sidebar-stats-panel";

interface MeetingSidebarProps {
  activeItemId: MeetingDashboardNavItemId;
  upcomingCount?: number;
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
  upcomingCount,
  onItemSelect,
}: MeetingSidebarProps) {
  const userId = useAppSelector((state) => state.auth.userId);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (localStorage.getItem("meetings_sidebar_collapsed") === "true") {
          setCollapsed(true);
        }
      } catch {
        // ignore storage errors
      }
    });
  }, []);

  const toggleCollapsed = (nextCollapsed: boolean) => {
    setCollapsed(nextCollapsed);
    try {
      localStorage.setItem("meetings_sidebar_collapsed", String(nextCollapsed));
    } catch {
      // ignore storage errors
    }
  };

  const summaryQuery = useMeetingHistorySummary();
  const recordingsQuery = useQuery({
    queryKey: ["meeting-recordings", userId, { page: 1 }],
    queryFn: () => recordingApi.list({ page: 1 }),
    enabled: Boolean(userId),
    staleTime: 60_000,
    retry: false,
  });

  const liveMeetings = summaryQuery.data?.data?.liveMeetings ?? 0;
  const totalMeetings = summaryQuery.data?.data?.totalMeetings ?? 0;
  const recordingsCount = recordingsQuery.data?.total;

  const getBadgeCount = (itemId: MeetingDashboardNavItemId): number | null => {
    if (
      itemId === MeetingDashboardNavItemId.UPCOMING &&
      typeof upcomingCount === "number" &&
      upcomingCount > 0
    ) {
      return upcomingCount;
    }
    if (
      itemId === MeetingDashboardNavItemId.RECORDINGS &&
      typeof recordingsCount === "number" &&
      recordingsCount > 0
    ) {
      return recordingsCount;
    }

    return null;
  };

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 shrink-0 flex-col border-b border-border bg-sidebar transition-[width] duration-200 @min-[1120px]/meetings:border-b-0 @min-[1120px]/meetings:border-r",
        collapsed
          ? "px-4 py-3 @min-[1120px]/meetings:w-14 @min-[1120px]/meetings:items-center @min-[1120px]/meetings:px-2 @min-[1120px]/meetings:py-3"
          : "px-4 py-4 @min-[1120px]/meetings:w-[276px] @min-[1120px]/meetings:py-4",
      )}
    >
      {collapsed ? (
        <div className="hidden h-full w-full flex-col items-center justify-between @min-[1120px]/meetings:flex">
          <div className="flex flex-col items-center gap-2.5">
            <IconButton
              label="Expand Meetings sidebar"
              showTooltip={false}
              size="icon-sm"
              onClick={() => toggleCollapsed(false)}
              title="Expand Meetings sidebar"
              className="size-9 rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </IconButton>

            <div className="my-0.5 h-px w-6 bg-border" />

            <nav
              aria-label="Meeting dashboard"
              className="flex flex-col items-center gap-2"
            >
              {meetingDashboardNavItems.map((item) => {
                const Icon = meetingNavIconById[item.id];
                const isActive = item.id === activeItemId;
                const badgeCount = getBadgeCount(item.id);

                return (
                  <div key={item.id} className="relative">
                    <IconButton
                      label={item.label}
                      showTooltip={false}
                      size="icon-sm"
                      disabled={!enabledMeetingNavItems.has(item.id)}
                      onClick={() => onItemSelect(item.id)}
                      title={item.label}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "size-9 rounded-control transition-all",
                        isActive
                          ? "bg-primary-soft text-primary-soft-foreground ring-2 ring-primary"
                          : cn("hover:bg-muted", item.iconClassName),
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </IconButton>
                    {badgeCount !== null && (
                      <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-sidebar tabular-nums">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="relative">
            <IconButton
              label="Expand to view Meeting stats"
              showTooltip={false}
              size="icon-sm"
              onClick={() => toggleCollapsed(false)}
              title={`Meeting stats • Total: ${totalMeetings}, Live: ${liveMeetings}`}
              className="size-9 rounded-control border border-border bg-card text-info-content hover:bg-muted"
            >
              <TrendingUp className="size-4" aria-hidden="true" />
            </IconButton>
            {liveMeetings > 0 && (
              <span className="pointer-events-none absolute right-1.5 top-1.5 size-1.5 rounded-full bg-success animate-pulse" />
            )}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col justify-between gap-5 overflow-auto overscroll-contain @min-[1120px]/meetings:flex-1",
          collapsed && "@min-[1120px]/meetings:hidden",
        )}
        role="region"
        aria-label="Meeting sidebar"
        tabIndex={0}
      >
        <div className="space-y-3">
          <div className="hidden items-center justify-between px-1 @min-[1120px]/meetings:flex">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Meetings
            </span>
            <IconButton
              label="Collapse Meetings sidebar"
              showTooltip={false}
              size="icon-sm"
              onClick={() => toggleCollapsed(true)}
              title="Collapse Meetings sidebar"
              className="size-8 rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="size-4" aria-hidden="true" />
            </IconButton>
          </div>

          <nav
            className="flex w-max min-w-full shrink-0 gap-1.5 pb-2 @min-[1120px]/meetings:w-full @min-[1120px]/meetings:flex-col @min-[1120px]/meetings:gap-1 @min-[1120px]/meetings:pb-0"
            aria-label="Meeting dashboard"
          >
            {meetingDashboardNavItems.map((item) => {
              const Icon = meetingNavIconById[item.id];
              const isActive = item.id === activeItemId;
              const badgeCount = getBadgeCount(item.id);

              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  disabled={!enabledMeetingNavItems.has(item.id)}
                  onClick={() => onItemSelect(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group/sidebar-item h-11 min-w-0 shrink-0 justify-between gap-2.5 rounded-control px-3 text-xs focus-visible:ring-inset motion-reduce:transition-none",
                    isActive
                      ? "bg-primary-soft font-bold text-primary-soft-foreground hover:bg-primary-soft hover:text-primary-soft-foreground"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-control transition-colors duration-150 motion-reduce:transition-none",
                        isActive
                          ? "bg-card text-primary-soft-foreground shadow-2xs"
                          : "bg-transparent group-hover/sidebar-item:bg-card group-hover/sidebar-item:shadow-2xs",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "size-4",
                          isActive
                            ? "text-primary-soft-foreground"
                            : item.iconClassName,
                        )}
                      />
                    </span>
                    <span className="min-w-0 truncate text-left">
                      {item.label}
                    </span>
                  </span>

                  {badgeCount !== null && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </nav>
        </div>

        <MeetingSidebarStatsPanel />
      </div>
    </aside>
  );
}
