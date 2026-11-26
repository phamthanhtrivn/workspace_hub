import {
  CalendarDays,
  Clock3,
  Copy,
  History,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  TrendingUp,
  UserRound,
  Video,
} from "lucide-react";
import {
  MeetingDashboardActionId,
  MeetingDashboardNavItemId,
  meetingActionIconById,
  meetingDashboardActions,
  meetingDashboardNavItems,
  meetingNavIconById,
} from "@/features/meeting/types/meeting.constants";
import {
  PREVIEW_DATE_LABEL,
  PREVIEW_MEETINGS,
  PREVIEW_TEAM,
  PREVIEW_TIME_LABEL,
} from "./preview-data";
import { PreviewShell } from "./preview-shell";
import {
  PreviewAction,
  PreviewAvatar,
  PreviewBadge,
  PreviewHeading,
  PreviewIcon,
  PreviewNavigation,
} from "./preview-ui";

const MEETING_HISTORY = [
  { title: "Research sync", date: "Oct 23, 2026", duration: "42 min" },
  { title: "Project kick-off", date: "Oct 20, 2026", duration: "35 min" },
] as const;
const MEETING_STATS = [
  { label: "Hosted", icon: UserRound, value: "3" },
  { label: "Total time", icon: Clock3, value: "6h 10m" },
  { label: "Last meeting", icon: CalendarDays, value: "Oct 23" },
] as const;

export function MeetingsPreview() {
  const [nearest, following] = PREVIEW_MEETINGS;

  return (
    <PreviewShell moduleId="meetings">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col @min-[1120px]/preview-module:flex-row">
        <aside className="shrink-0 border-b border-border bg-sidebar p-4 @min-[1120px]/preview-module:flex @min-[1120px]/preview-module:w-[276px] @min-[1120px]/preview-module:flex-col @min-[1120px]/preview-module:border-b-0 @min-[1120px]/preview-module:border-r @min-[1120px]/preview-module:py-4">
          <div className="mb-3 hidden items-center justify-between px-1 @min-[1120px]/preview-module:flex">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Meetings
            </span>
            <PreviewIcon
              icon={PanelLeftClose}
              label="Collapse Meetings sidebar"
            />
          </div>
          <div className="overflow-x-auto">
            <PreviewNavigation
              items={meetingDashboardNavItems.map((item) => ({
                label: item.label,
                icon: meetingNavIconById[item.id],
                iconClassName: item.iconClassName,
                active: item.id === MeetingDashboardNavItemId.OVERVIEW,
                count:
                  item.id === MeetingDashboardNavItemId.UPCOMING
                    ? String(PREVIEW_MEETINGS.length)
                    : undefined,
              }))}
              className="@min-[1120px]/preview-module:flex-col"
            />
          </div>
          <div className="mt-auto hidden space-y-3 rounded-panel border border-border bg-card p-3.5 @min-[1120px]/preview-module:block">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-foreground">
                Meeting stats
              </h5>
              <TrendingUp
                aria-hidden="true"
                className="size-4 text-info-content"
              />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">
                Total meetings
              </p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">
                8
              </p>
            </div>
            <div className="flex gap-2">
              <PreviewBadge tone="success">Live 0</PreviewBadge>
              <PreviewBadge>Ended 8</PreviewBadge>
            </div>
            <dl className="space-y-2 border-t border-border pt-2.5 text-xs">
              {MEETING_STATS.map(({ label, icon: Icon, value }) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <Icon aria-hidden="true" className="size-3.5" />
                    {label}
                  </dt>
                  <dd className="font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
        <div
          role="region"
          aria-label="Sample meetings dashboard"
          tabIndex={0}
          className="@container/preview-meetings min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[800px]/preview-module:p-6"
        >
          <div className="border-b border-border pb-5">
            <PreviewHeading
              title="Meetings"
              subtitle={`${PREVIEW_DATE_LABEL} · ${PREVIEW_TIME_LABEL}`}
            >
              <PreviewAction>
                <Clock3 aria-hidden="true" />
                {PREVIEW_MEETINGS.length} upcoming meetings
              </PreviewAction>
            </PreviewHeading>
          </div>
          <div className="grid grid-cols-1 gap-4 @min-[480px]/preview-meetings:grid-cols-2 @min-[880px]/preview-meetings:grid-cols-4">
            {meetingDashboardActions.map((action) => {
              const Icon = meetingActionIconById[action.id];
              const primary =
                action.id === MeetingDashboardActionId.NEW_MEETING;

              return (
                <div
                  key={action.id}
                  className={`flex min-w-0 items-center gap-3 rounded-panel border p-4 ${primary ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card"}`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-control ${primary ? "" : "bg-secondary text-secondary-foreground"}`}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5">
                      {action.title}
                    </p>
                    <p
                      className={`mt-1 text-xs leading-4 ${primary ? "" : "text-muted-foreground"}`}
                    >
                      {action.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid items-start gap-8 @min-[900px]/preview-meetings:grid-cols-[3fr_2fr]">
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <h5 className="text-section-title font-semibold">
                  Next meetings
                </h5>
                <span className="text-xs font-semibold text-link">
                  View all
                </span>
              </div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Wednesday, October 28
              </p>
              <div className="rounded-panel border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <PreviewBadge tone="info">Scheduled</PreviewBadge>
                    <p className="mt-3 text-lg font-semibold">
                      {nearest.title}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      {nearest.date} · {nearest.time}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Host: Linh · {nearest.project}
                    </p>
                  </div>
                  <MoreHorizontal
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex -space-x-1.5">
                    {PREVIEW_TEAM.map((member) => (
                      <PreviewAvatar
                        key={member.name}
                        name={member.name}
                        className="size-8 ring-2 ring-card"
                      />
                    ))}
                  </span>
                  <span className="flex items-center gap-2">
                    <Copy
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                    <PreviewAction className="text-muted-foreground">
                      Waiting for host
                    </PreviewAction>
                  </span>
                </div>
              </div>
              <div className="my-4 flex items-start gap-3 border-b border-border pb-4">
                <CalendarDays
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{following.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {following.date} · {following.time}
                  </p>
                </div>
                <PreviewBadge tone="info">Scheduled</PreviewBadge>
              </div>
              <PreviewAction>
                <Plus aria-hidden="true" />
                Schedule meeting
              </PreviewAction>
            </div>
            <div className="min-w-0">
              <div className="mb-4 flex items-center justify-between">
                <h5 className="text-section-title font-semibold">
                  Recent meetings
                </h5>
                <History
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
              </div>
              <div className="divide-y divide-border">
                {MEETING_HISTORY.map((meeting) => (
                  <div key={meeting.title} className="py-4 first:pt-0">
                    <div className="flex items-center gap-2">
                      <Video
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                      <p className="text-sm font-semibold">{meeting.title}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {meeting.date} · {meeting.duration}
                    </p>
                    <PreviewBadge className="mt-2">Ended</PreviewBadge>
                  </div>
                ))}
              </div>
              <span className="mt-4 inline-block text-xs font-semibold text-link">
                View history
              </span>
            </div>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
