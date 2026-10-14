"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Temporal } from "temporal-polyfill";
import { useAppSelector } from "@/store/store";
import { useUserSettingsQuery } from "@/features/user-setting/hooks/useUserSettingQueries";
import { calendarKeys } from "@/features/calendar/hooks/use-calendar-queries";
import { getCalendarEvents } from "@/features/calendar/api/calendar.api";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import { usePomodoroSessionActions } from "@/features/pomodoro/components/pomodoro-session-provider";
import {
  getDashboardDayMeetings,
  getDashboardFocusSessions,
  getPersonalDashboardTasks,
  getProjectDashboardTasks,
} from "../api/dashboard.api";
import {
  buildDayItems,
  dateInZone,
  dayBounds,
  focusDays,
  sortTasks,
} from "../utils/dashboard.utils";

export function useDashboardClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date().toISOString());
    update();
    const timer = setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  return now;
}

export function useDashboard() {
  const [taskFilter, setTaskFilter] = useState<"All" | "Overdue" | "Today">(
    "All",
  );
  const auth = useAppSelector((state) => state.auth);
  const settings = useUserSettingsQuery({ enabled: Boolean(auth.userId) });
  const now = useDashboardClock();
  const zone = settings.data?.data.timezone || "Asia/Ho_Chi_Minh";
  const today = now ? dateInZone(now, zone) : "";
  const ready = Boolean(auth.userId && today);
  const bounds = today ? dayBounds(today, zone) : { startAt: "", endAt: "" };
  const actions = usePomodoroSessionActions();
  const personal = useQuery({
    queryKey: [
      ...calendarKeys.all,
      "dashboard-tasks",
      auth.userId,
      today,
      zone,
    ],
    queryFn: () => getPersonalDashboardTasks(auth.userId!),
    enabled: ready,
    staleTime: 30_000,
  });
  const project = useQuery({
    queryKey: ["projects", "dashboard-tasks", auth.userId, today],
    queryFn: () => getProjectDashboardTasks(auth.userId!),
    enabled: ready,
    staleTime: 30_000,
  });
  const events = useQuery({
    queryKey: [...calendarKeys.events(bounds), auth.userId],
    queryFn: () => getCalendarEvents(bounds),
    enabled: ready,
    staleTime: 30_000,
  });
  const meetings = useQuery({
    queryKey: [
      ...meetingKeys.upcomingRoot,
      "dashboard-day",
      auth.userId,
      today,
      zone,
    ],
    queryFn: () => getDashboardDayMeetings(bounds.endAt),
    enabled: ready,
    staleTime: 30_000,
  });
  const dayMeetings = meetings;
  const weekStart = today
    ? dayBounds(
        Temporal.PlainDate.from(today).subtract({ days: 6 }).toString(),
        zone,
      ).startAt
    : "";
  const focus = useQuery({
    queryKey: [
      "pomodoro",
      "dashboard-report",
      auth.userId,
      today,
      zone,
      actions.sessionRevision,
    ],
    queryFn: ({ signal }) =>
      getDashboardFocusSessions(weekStart, bounds.endAt, signal),
    enabled: ready,
    staleTime: 30_000,
  });
  const tasks = sortTasks(
    [...(personal.data || []), ...(project.data || [])],
    today,
    zone,
  );
  const upcoming = (meetings.data || [])
    .filter(
      (meeting) =>
        meeting.status === "LIVE" ||
        (meeting.status === "SCHEDULED" &&
          (!meeting.scheduledEndAt ||
            !now ||
            Date.parse(meeting.scheduledEndAt) > Date.parse(now))),
    )
    .sort(
      (a, b) =>
        Number(b.status === "LIVE") - Number(a.status === "LIVE") ||
        Date.parse(a.scheduledStartAt || "") -
          Date.parse(b.scheduledStartAt || ""),
    );
  return {
    auth,
    now,
    zone,
    today,
    ready,
    personal,
    project,
    events,
    meetings,
    dayMeetings,
    focus,
    tasks,
    upcoming: upcoming.slice(0, 3),
    taskFilter,
    setTaskFilter,
    dayItems: today
      ? buildDayItems(
          events.data || [],
          tasks,
          dayMeetings.data || [],
          today,
          zone,
        )
      : [],
    daily: today ? focusDays(focus.data || [], today, zone) : [],
  };
}
