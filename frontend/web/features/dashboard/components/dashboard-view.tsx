"use client";

import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  ListChecks,
  Video,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { useDashboard } from "../hooks/use-dashboard";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";
import { DashboardTasks } from "./dashboard-tasks";
import { DashboardProductivity } from "./dashboard-productivity";
import { DashboardFocus } from "./dashboard-focus";
import { DashboardMeetings } from "./dashboard-meetings";
import { DashboardExtras } from "./dashboard-extras";
import {
  formatMinutes,
  formatTime,
  taskBucket,
} from "../utils/dashboard.utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardQuickActions } from "./dashboard-quick-actions";
import { DashboardSun } from "./dashboard-sun";

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
      value: tasksReady
        ? String(
            tasks.filter((task) => taskBucket(task, today, zone) === "Overdue")
              .length,
          )
        : "…",
      detail: "Tasks needing attention",
      icon: AlertCircle,
      href: "#my-tasks",
      danger: true,
      theme: "text-[var(--color-destructive)]",
    },
    {
      label: "Due today",
      value: tasksReady
        ? String(
            tasks.filter((task) => taskBucket(task, today, zone) === "Today")
              .length,
          )
        : "…",
      detail: "Open tasks due today",
      icon: ListChecks,
      href: "#my-tasks",
      danger: false,
      theme: "text-[var(--color-primary)]",
    },
    {
      label: "Focus today",
      value:
        focus.isSuccess && todayFocus ? formatMinutes(todayFocus.minutes) : "…",
      detail: "Recorded focus time",
      icon: Clock3,
      href: "/pomodoro",
      danger: false,
      theme: "text-[var(--color-primary-dark)]",
    },
    {
      label: "Next meeting",
      value: meetings.isSuccess ? nextLabel : "…",
      detail: next?.title || "Your next scheduled meeting",
      icon: Video,
      href: next
        ? `/meetings/${encodeURIComponent(next.joinToken)}`
        : "/meetings",
      danger: false,
      theme: "text-[var(--color-primary-dark)]",
    },
  ];
  return (
    <div className="min-h-full bg-[var(--color-background)] text-[var(--color-primary-dark)]">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <DashboardSun now={now} zone={zone} />
            <div className="min-w-0">
              <p className="mb-2 text-xs text-[var(--muted-foreground)]">
                {greeting}, {auth.fullName?.split(" ")[0] || "there"}
              </p>
              <h1 className="font-sans text-2xl font-semibold tracking-tight">
                {now
                  ? new Intl.DateTimeFormat("en", {
                      timeZone: zone,
                      weekday: "long",
                    }).format(new Date(now))
                  : "Your workday"}
                {now &&
                  `, ${new Intl.DateTimeFormat("en", { timeZone: zone, day: "2-digit" }).format(new Date(now))}`}
                <span className="text-[var(--color-primary)]">.</span>
              </h1>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Your schedule, priorities and a little room to focus.
              </p>
            </div>
          </div>
          <DashboardQuickActions />
        </header>
        <div className="grid grid-cols-2 border-y border-[var(--border)] xl:grid-cols-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              onClick={() => {
                if (stat.label === "Overdue")
                  dashboard.setTaskFilter("Overdue");
                if (stat.label === "Due today")
                  dashboard.setTaskFilter("Today");
              }}
              className={`min-w-0 border-b border-[var(--border)] px-3 py-4 transition-colors hover:bg-[var(--muted)] sm:px-5 xl:border-b-0 [&:nth-child(even)]:border-l xl:[&:not(:first-child)]:border-l ${stat.theme}`}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
                <span>{stat.label}</span>
                <stat.icon size={13} />
              </div>
              <p className="mt-2 truncate text-3xl font-medium tracking-tight tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 truncate text-[11px] text-[var(--muted-foreground)]">
                {stat.detail}
              </p>
            </Link>
          ))}
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:gap-10">
          <div className="space-y-6">
            <DashboardPanel
              title="My day"
              href="/calendar"
              description="Your schedule and deadlines for today"
            >
              <QueryFeedback query={dashboard.events} label="calendar events" />
              <QueryFeedback query={personal} label="personal deadlines" />
              <QueryFeedback query={project} label="project deadlines" />
              <QueryFeedback
                query={dashboard.dayMeetings}
                label="meeting schedule"
              />
              {!dayItems.length &&
                dashboard.events.isSuccess &&
                tasksReady &&
                dashboard.dayMeetings.isSuccess && (
                  <EmptyState>
                    No events or deadlines today. Make room for focused work.
                  </EmptyState>
                )}
              <ul className="border-l border-[var(--border)] pl-3">
                {dayItems.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="relative flex items-center gap-3 border-b border-[var(--border)] py-4 pr-2 hover:bg-[var(--muted)] before:absolute before:-left-[17px] before:h-2 before:w-2 before:rounded-full before:bg-[var(--color-primary)]"
                    >
                      <time className="w-16 shrink-0 text-xs font-medium tabular-nums text-slate-500">
                        {item.allDay ? "All day" : formatTime(item.at, zone)}
                      </time>
                      <span className="grid h-7 w-7 shrink-0 place-items-center text-[var(--muted-foreground)]">
                        {item.kind === "Meeting" ? (
                          <Video size={15} />
                        ) : item.kind === "Task" ? (
                          <ListChecks size={15} />
                        ) : (
                          <CalendarDays size={15} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {item.kind}
                          {item.kind === "Task" ? " · Due today" : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </DashboardPanel>
            <div id="my-tasks" className="scroll-mt-6">
              <DashboardTasks dashboard={dashboard} />
            </div>
          </div>
          <div className="space-y-8 lg:border-l lg:border-[var(--border)] lg:pl-8">
            <DashboardProductivity dashboard={dashboard} />
            <DashboardFocus
              query={focus}
              today={focus.isSuccess ? todayFocus : undefined}
            />
            <DashboardMeetings dashboard={dashboard} />
          </div>
        </div>
        <DashboardExtras dashboard={dashboard} />
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
        className="space-y-5"
      >
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  return <PersonalDashboard key={userId} />;
}
