"use client";

import Link from "next/link";
import {
  AlertCircle,
  Clock3,
  ListChecks,
  Video,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { useDashboard } from "../hooks/use-dashboard";
import { Badge } from "@/components/ui/badge";
import { DashboardDay } from "./dashboard-day";
import { DashboardTasks } from "./dashboard-tasks";
import { DashboardProductivity } from "./dashboard-productivity";
import { DashboardMeetings } from "./dashboard-meetings";
import { DashboardExtras } from "./dashboard-extras";
import {
  formatMinutes,
  taskBucket,
} from "../utils/dashboard.utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { DashboardWeather } from "./dashboard-weather";
import { formatScheduledRelativeTime, selectDashboardContext } from "../utils/dashboard-context.utils";

function PersonalDashboard() {
  const dashboard = useDashboard();
  const {
    auth,
    today,
    now,
    zone,
    tasks,
    personal,
    project,
    dayItems,
    focus,
    daily,
    upcoming,
    meetings,
  } = dashboard;
  const tasksReady = personal.isSuccess && project.isSuccess;
  const overdueCount = tasks.filter((task) => taskBucket(task, today, zone) === "Overdue").length;
  const dueTodayCount = tasks.filter((task) => taskBucket(task, today, zone) === "Today").length;
  const timelineReady = [dashboard.events, personal, project, dashboard.dayMeetings].every((query) => query.data !== undefined);
  const { nextItem, liveMeeting } = selectDashboardContext({ dayItems: timelineReady ? dayItems : [], upcoming, now, today, zone });
  const contextTitle = liveMeeting?.title ?? nextItem?.title;
  const contextHref = liveMeeting ? `/meetings/${encodeURIComponent(liveMeeting.joinToken)}` : nextItem?.href;
  const todayFocus = daily.at(-1);
  const next = upcoming[0];
  const wait =
    next?.scheduledStartAt && now
      ? Math.max(
          0,
          Math.ceil(
            (Date.parse(next.scheduledStartAt) - Date.parse(now)) / 60_000,
          ),
        )
      : null;
  const nextLabel =
    next?.status === "LIVE"
      ? "Live now"
      : wait !== null
        ? wait >= 1440
          ? `${Math.floor(wait / 1440)}d ${Math.floor((wait % 1440) / 60)}h`
          : wait >= 60
            ? `${Math.floor(wait / 60)}h ${wait % 60}m`
            : `${wait} min`
        : "None planned";
  const hour = now
    ? Number(
        new Intl.DateTimeFormat("en", {
          timeZone: zone,
          hour: "numeric",
          hourCycle: "h23",
        }).format(new Date(now)),
      )
    : 12;
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const stats = [
    {
      label: "Overdue",
      value: tasksReady ? String(overdueCount) : "…",
      detail: "Tasks needing attention",
      icon: AlertCircle,
      href: "#my-tasks",
      theme: tasksReady && overdueCount > 0 ? "text-destructive-content" : "text-foreground",
      iconTheme: tasksReady && overdueCount > 0 ? "bg-destructive-soft text-destructive-content" : "bg-secondary text-secondary-foreground",
      queries: [personal, project],
      errorHref: "#my-tasks",
      errorDetail: "Could not load all tasks. View retry options.",
    },
    {
      label: "Due today",
      value: tasksReady ? String(dueTodayCount) : "…",
      detail: "Open tasks due today",
      icon: ListChecks,
      href: "#my-tasks",
      theme: tasksReady && dueTodayCount > 0 ? "text-link" : "text-foreground",
      iconTheme: tasksReady && dueTodayCount > 0 ? "bg-primary-soft text-primary-soft-foreground" : "bg-secondary text-secondary-foreground",
      queries: [personal, project],
      errorHref: "#my-tasks",
      errorDetail: "Could not load all tasks. View retry options.",
    },
    {
      label: "Focus today",
      value:
        focus.isSuccess && todayFocus ? formatMinutes(todayFocus.minutes) : "…",
      detail: "Recorded focus time",
      icon: Clock3,
      href: "/pomodoro",
      theme: "text-foreground",
      iconTheme: "bg-secondary text-secondary-foreground",
      queries: [focus],
      errorHref: "#focus-report",
      errorDetail: "Could not load focus time. View retry options.",
    },
    {
      label: "Next meeting",
      value: meetings.isSuccess ? nextLabel : "…",
      detail: next?.title || "Your next scheduled meeting",
      icon: Video,
      href: next
        ? `/meetings/${encodeURIComponent(next.joinToken)}`
        : "/meetings",
      theme: "text-foreground",
      iconTheme: "bg-secondary text-secondary-foreground",
      queries: [meetings],
      errorHref: "#upcoming-meetings",
      errorDetail: "Could not load meetings. View retry options.",
    },
  ];
  return (
    <div className="min-h-full min-w-0 w-full bg-background text-foreground">
      <div className="@container/dashboard min-w-0 w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 max-w-full items-center gap-4 sm:gap-6">
            <DashboardWeather now={now} zone={zone} />
            <div className="min-w-0">
              <p className="mb-2 break-words text-xs text-muted-foreground">
                {greeting}, {auth.fullName?.split(" ")[0] || "there"}
              </p>
              <h1 className="break-words font-sans text-page-title font-semibold tracking-tight">
                {now
                  ? new Intl.DateTimeFormat("en", {
                      timeZone: zone,
                      weekday: "long",
                    }).format(new Date(now))
                  : "Your workday"}
                {now &&
                  `, ${new Intl.DateTimeFormat("en", { timeZone: zone, day: "2-digit" }).format(new Date(now))}`}
                <span className="text-link">.</span>
              </h1>
              <div className="mt-3 flex min-h-11 min-w-0 items-center text-xs">
                {contextTitle && contextHref ? (
                  <Link href={contextHref} className="flex min-h-11 min-w-0 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-control py-1 text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150">
                    <Badge className={liveMeeting ? "bg-success-soft text-success-content" : undefined}>{liveMeeting ? "Live now" : "Up next"}</Badge>
                    <span className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">{contextTitle}</span>
                    {!liveMeeting && nextItem && <span>{formatScheduledRelativeTime(nextItem.at, now)}</span>}
                  </Link>
                ) : <p className="text-muted-foreground">Your schedule, priorities and a little room to focus.</p>}
              </div>
            </div>
          </div>
          <DashboardQuickActions />
        </header>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const hasError = stat.queries.some((query) => query.isError);
            const isPending =
              !hasError && stat.queries.some((query) => query.isPending);
            return (
              <Card key={stat.label} className="min-w-0 gap-0 overflow-hidden p-0">
              <Link
                href={hasError ? stat.errorHref : stat.href}
                onClick={() => {
                  if (stat.label === "Overdue")
                    dashboard.setTaskFilter("Overdue");
                  if (stat.label === "Due today")
                    dashboard.setTaskFilter("Today");
                }}
                className={`flex min-h-36 min-w-0 flex-1 cursor-pointer flex-col rounded-panel p-4 hover:bg-muted active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150 sm:p-5 ${hasError ? "text-foreground" : stat.theme}`}
              >
                <div className="flex min-w-0 items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
                  <span>{stat.label}</span>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-control ${hasError ? "bg-secondary text-secondary-foreground" : stat.iconTheme}`}>
                    <stat.icon aria-hidden size={17} />
                  </span>
                </div>
                <p
                  role="status"
                  aria-busy={isPending}
                  className={`mt-3 break-words font-medium tracking-tight tabular-nums ${hasError ? "text-lg text-muted-foreground" : "text-3xl"}`}
                >
                  <span className="sr-only">{stat.label}: </span>
                  {hasError ? "Unavailable" : isPending ? (
                    <>
                      <span aria-hidden>…</span>
                      <span className="sr-only">Loading</span>
                    </>
                  ) : stat.value}
                </p>
                <p
                  title={hasError ? undefined : stat.detail}
                  className={`mt-1 text-xs text-muted-foreground ${hasError ? "break-words" : "truncate"}`}
                >
                  {hasError ? stat.errorDetail : stat.detail}
                </p>
              </Link>
              </Card>
            );
          })}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6 @min-[960px]/dashboard:grid-cols-2">
          <DashboardDay dashboard={dashboard} nextItemKey={nextItem?.key} />
          <div id="upcoming-meetings" className="flex min-w-0 scroll-mt-6">
            <DashboardMeetings dashboard={dashboard} />
          </div>
          <div id="my-tasks" className="flex min-w-0 scroll-mt-6">
            <DashboardTasks dashboard={dashboard} />
          </div>
          <div id="focus-report" className="flex min-w-0 scroll-mt-6">
            <DashboardProductivity dashboard={dashboard} />
          </div>
          <DashboardExtras dashboard={dashboard} />
        </div>
      </div>
    </div>
  );
}

export function DashboardView() {
  const userId = useAppSelector((state) => state.auth.userId);
  if (!userId)
    return (
      <div
        role="status"
        aria-label="Loading your dashboard"
        className="@container/dashboard min-w-0 w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8"
      >
        <Skeleton className="h-10 w-64 max-w-full" />
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-36 w-full rounded-panel" />)}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6 @min-[960px]/dashboard:grid-cols-2">
          {["h-48", "h-48", "h-[28rem]", "h-[28rem]", "h-48", "h-80", "h-80"].map((height, index) => (
            <Skeleton key={index} className={`w-full rounded-panel ${height} ${index === 4 ? "col-span-full" : ""}`} />
          ))}
        </div>
      </div>
    );
  return <PersonalDashboard key={userId} />;
}
