"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { getProjects } from "@/features/project/api/project.api";
import { ProjectStatus } from "@/features/project/types/project";
import { getCalendarTodaySummary } from "@/features/calendar/api/calendar.api";
import { getSpaceUnreadSummary } from "@/features/chat/api/space.api";
import { getMeetingBadgeSummary } from "@/features/meeting/api/meeting.api";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import { chatKeys } from "@/features/chat/types/chat.constant";
import { documentsApi } from "@/features/documents/api/documents.api";
import { notebooksApi } from "@/features/ai/api/notebooks.api";
import { notebookKeys } from "@/features/ai/types/notebook-list";
import { getDailyStats } from "@/features/pomodoro/api/pomodoro-server.api";
import { usePomodoroSession } from "@/features/pomodoro/components/pomodoro-session-provider";
import { usePomodoroConfig } from "@/features/pomodoro/components/pomodoro-config-provider";
import { formatTimerClock } from "@/features/pomodoro/utils/pomodoro-timer-presentation";
import { localDateKey } from "@/features/pomodoro/utils/pomodoro-report";
import { zonedDayBounds } from "@/lib/timezone";
import type { WorkspaceNavItemId } from "./workspace-navigation";

export type WorkspaceBadgeTone =
  "neutral" | "info" | "success" | "warning" | "danger" | "urgent";

export interface WorkspaceNavBadge {
  text: string;
  compactText?: string;
  title: string;
  tone: WorkspaceBadgeTone;
  pulse?: boolean;
  isPomodoro?: boolean;
  pomodoroProgressText?: string;
  pomodoroLiveText?: string;
  pomodoroActive?: boolean;
}

function formatStoragePercentage(
  usedBytes: number,
  quotaBytes: number,
): string {
  if (quotaBytes <= 0 || usedBytes <= 0) return "0%";
  const pct = (usedBytes / quotaBytes) * 100;
  if (pct < 1) return "<1%";

  return `${Math.min(100, Math.round(pct))}%`;
}

export function useWorkspaceSidebarBadges(): Partial<
  Record<WorkspaceNavItemId, WorkspaceNavBadge>
> {
  const userId = useAppSelector((state) => state.auth.userId);
  const timeZone = useAccountTimezone();
  const enabled = Boolean(userId);
  const todayKey = localDateKey(new Date(), timeZone);

  const dayBounds = useMemo(
    () => zonedDayBounds(todayKey, timeZone),
    [todayKey, timeZone],
  );

  const projectsQuery = useQuery({
    queryKey: ["projects", "sidebar-badge", userId],
    queryFn: () =>
      getProjects({ page: 1, limit: 1, status: ProjectStatus.ACTIVE }),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const calendarSummaryQuery = useQuery({
    queryKey: ["calendar", "today-summary", userId, todayKey],
    queryFn: ({ signal }) =>
      getCalendarTodaySummary(dayBounds.startAt, dayBounds.endAt, signal),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const chatUnreadQuery = useQuery({
    queryKey: chatKeys.unreadSummary(userId),
    queryFn: ({ signal }) => getSpaceUnreadSummary(signal),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  const meetingBadgeQuery = useQuery({
    queryKey: [...meetingKeys.upcomingRoot, "badge-summary", userId, todayKey],
    queryFn: ({ signal }) =>
      getMeetingBadgeSummary(dayBounds.startAt, dayBounds.endAt, signal),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  const quotaQuery = useQuery({
    queryKey: ["document-quota"],
    queryFn: () => documentsApi.getQuota(),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const notebooksQuery = useQuery({
    queryKey: notebookKeys.list(userId ?? "", {
      page: 1,
      search: "",
      sort: "updated_desc",
    }),
    queryFn: ({ signal }) =>
      notebooksApi.page({ page: 1, search: "", sort: "updated_desc" }, signal),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const {
    status: pomodoroStatus,
    timeLeft,
    sessionRevision,
  } = usePomodoroSession();
  const pomodoroDailyQuery = useQuery({
    queryKey: [
      "pomodoro",
      "daily-stats",
      userId,
      timeZone,
      todayKey,
      sessionRevision,
    ],
    queryFn: () => getDailyStats(timeZone),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
  const { config: pomodoroConfig } = usePomodoroConfig();

  return useMemo(() => {
    const badges: Partial<Record<WorkspaceNavItemId, WorkspaceNavBadge>> = {};

    const activeProjects = projectsQuery.data?.meta?.total;
    if (typeof activeProjects === "number" && activeProjects > 0) {
      badges.projects = {
        text: String(activeProjects),
        title: `${activeProjects} active ${activeProjects === 1 ? "project" : "projects"}`,
        tone: "neutral",
      };
    }

    const calendarSummary = calendarSummaryQuery.data;
    if (calendarSummary && calendarSummary.totalTodayCount > 0) {
      badges.calendar = {
        text: String(calendarSummary.totalTodayCount),
        title: `${calendarSummary.eventsTodayCount} events & ${calendarSummary.tasksDueTodayCount} tasks due today`,
        tone: "info",
      };
    }

    const completedSessions = pomodoroDailyQuery.data?.completedPomodoros ?? 0;
    const dailyGoal = pomodoroConfig.dailyGoalPomodoros || 4;
    const progressText = `${completedSessions}/${dailyGoal}`;
    const isPomodoroLive = pomodoroStatus !== "IDLE";
    const liveText = formatTimerClock(timeLeft);

    badges.pomodoro = {
      text: isPomodoroLive ? liveText : progressText,
      compactText: isPomodoroLive ? "●" : progressText,
      title: isPomodoroLive
        ? `Live session (${liveText} remaining) — click badge to switch view`
        : `${completedSessions} of ${dailyGoal} daily focus sessions completed`,
      tone: isPomodoroLive ? "success" : "info",
      pulse: isPomodoroLive,
      isPomodoro: true,
      pomodoroProgressText: progressText,
      pomodoroLiveText: liveText,
      pomodoroActive: isPomodoroLive,
    };

    const unreadTotal = chatUnreadQuery.data?.totalUnreadCount ?? 0;
    if (unreadTotal > 0) {
      badges.messages = {
        text: unreadTotal > 99 ? "99+" : String(unreadTotal),
        title: `${chatUnreadQuery.data?.unreadChannelsCount ?? 0} unread channels & ${chatUnreadQuery.data?.unreadDirectMessagesCount ?? 0} unread DMs`,
        tone: "urgent",
      };
    }

    const meetingSummary = meetingBadgeQuery.data;
    if (meetingSummary && meetingSummary.badgeCount > 0) {
      badges.meetings = {
        text: String(meetingSummary.badgeCount),
        title:
          meetingSummary.liveCount > 0
            ? `${meetingSummary.liveCount} live & ${meetingSummary.upcomingTodayCount} upcoming today`
            : `${meetingSummary.upcomingTodayCount} upcoming meetings today`,
        tone: "success",
        pulse: meetingSummary.liveCount > 0,
      };
    }

    const quota = quotaQuery.data;
    if (quota) {
      const pctText = formatStoragePercentage(quota.usedBytes, quota.maxBytes);
      const pctRatio =
        quota.maxBytes > 0 ? quota.usedBytes / quota.maxBytes : 0;

      badges.documents = {
        text: pctText,
        title: `Storage used: ${pctText}`,
        tone: pctRatio >= 0.9 ? "danger" : "warning",
      };
    }

    const notebooksTotal = notebooksQuery.data?.meta?.total;
    if (typeof notebooksTotal === "number" && notebooksTotal > 0) {
      badges.ai = {
        text: String(notebooksTotal),
        title: `${notebooksTotal} personal ${notebooksTotal === 1 ? "notebook" : "notebooks"}`,
        tone: "neutral",
      };
    }

    return badges;
  }, [
    calendarSummaryQuery.data,
    chatUnreadQuery.data,
    meetingBadgeQuery.data,
    notebooksQuery.data?.meta?.total,
    pomodoroConfig.dailyGoalPomodoros,
    pomodoroDailyQuery.data?.completedPomodoros,
    pomodoroStatus,
    projectsQuery.data?.meta?.total,
    quotaQuery.data,
    timeLeft,
  ]);
}
