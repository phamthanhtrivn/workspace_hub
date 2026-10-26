import { CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Menu, Plus } from "lucide-react";
import { CALENDAR_DEFAULT_EVENT_COLOR, CALENDAR_DEFAULT_TASK_COLOR } from "@/features/calendar/types/calendar.constants";
import { readableTextOnColor } from "@/lib/color";
import { PREVIEW_PROJECT } from "../../landing-content";
import { PREVIEW_CALENDAR_DAYS, PREVIEW_CALENDAR_EVENTS, PREVIEW_CALENDAR_HOURS, PREVIEW_MINI_CALENDAR_DAYS, type PreviewCalendarEvent } from "./preview-data";
import { PreviewShell } from "./preview-shell";
import { PreviewAction, PreviewSelect } from "./preview-ui";

const CALENDAR_LIST = [
  { label: "Personal", color: CALENDAR_DEFAULT_EVENT_COLOR },
  { label: "Tasks", color: CALENDAR_DEFAULT_TASK_COLOR },
  { label: PREVIEW_PROJECT, color: "var(--brand-blue)" },
] as const;
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const HOUR_HEIGHT_REM = 3.5;

function CalendarEventPreview({ event }: { event: PreviewCalendarEvent }) {
  const color = event.isTask ? CALENDAR_DEFAULT_TASK_COLOR : CALENDAR_DEFAULT_EVENT_COLOR;
  return <div className="absolute inset-x-0.5 h-14 overflow-hidden rounded px-1.5 py-1" style={{ top: `${event.start * HOUR_HEIGHT_REM}rem`, backgroundColor: color, color: readableTextOnColor(color) }}><p className="break-words text-xs font-semibold leading-tight">{event.isTask && <Circle aria-hidden="true" className="mr-1 inline size-3" />}{event.title}</p><p className="mt-1 text-[10px] tabular-nums">{event.time}</p></div>;
}

function MiniCalendarPreview() {
  return <div className="px-4 py-5"><div className="mb-4 flex items-center justify-between text-sm font-semibold"><span>October 2026</span><span className="flex gap-3"><ChevronLeft aria-hidden="true" className="size-3.5" /><ChevronRight aria-hidden="true" className="size-3.5" /></span></div><div className="grid grid-cols-7 gap-y-1 text-center text-xs">{WEEKDAY_INITIALS.map((day, index) => <span key={index} className="py-1 text-muted-foreground">{day}</span>)}{PREVIEW_MINI_CALENDAR_DAYS.map(day => <span key={day.key} className={`mx-auto flex size-7 items-center justify-center rounded-full ${day.date === 26 && day.currentMonth ? "bg-primary font-semibold text-primary-foreground" : day.currentMonth ? "" : "text-muted-foreground"}`}>{day.date}</span>)}</div></div>;
}

export function CalendarPreview() {
  return <PreviewShell moduleId="calendar">
    <div className="flex min-h-0 min-w-0 flex-1">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar @min-[960px]/preview-module:flex"><div className="px-4 pt-4"><PreviewAction className="h-11 gap-2.5 rounded-full px-4 text-sm"><span className="rounded-full bg-info-soft p-1 text-info-content"><Plus aria-hidden="true" className="size-4" /></span>Create event</PreviewAction></div><MiniCalendarPreview /><div className="mx-4 border-t border-border pt-4"><p className="mb-3 flex items-center justify-between text-sm font-semibold">My Calendars<Plus aria-hidden="true" className="size-4" /></p>{CALENDAR_LIST.slice(0, 2).map(calendar => <div key={calendar.label} className="flex items-center gap-2.5 py-2 text-sm"><span className="flex size-4 items-center justify-center rounded-sm text-xs text-on-color" style={{ backgroundColor: calendar.color }}><Check aria-hidden="true" className="size-3" /></span>{calendar.label}</div>)}<p className="mb-3 mt-6 text-sm font-semibold">Project calendars</p><div className="flex items-center gap-2.5 text-sm"><span className="size-4 shrink-0 rounded-sm bg-brand-blue" /><span className="truncate">{PREVIEW_PROJECT}</span></div></div></aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pb-3 @min-[800px]/preview-module:px-5">
        <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border py-2"><div className="flex flex-wrap items-center gap-2"><Menu aria-hidden="true" className="size-5 text-muted-foreground" /><PreviewAction>Today</PreviewAction><ChevronLeft aria-hidden="true" className="size-4 text-muted-foreground" /><ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" /><h4 className="text-section-title font-semibold">Oct 26 – Nov 1, 2026</h4></div><PreviewSelect>Week</PreviewSelect></div>
        <div role="region" aria-label="Sample weekly calendar" tabIndex={0} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain rounded-control outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-border"><span className="self-end pb-2 text-xs text-muted-foreground">GMT+7</span>{PREVIEW_CALENDAR_DAYS.map((day, index) => <div key={day.label} className="flex flex-col items-center gap-1 border-l border-border py-3"><span className={`text-xs ${index === 0 ? "font-semibold text-info-content" : "text-muted-foreground"}`}>{day.label}</span><span className={`grid size-8 place-items-center rounded-full text-lg ${index === 0 ? "bg-primary font-semibold text-primary-foreground" : ""}`}>{day.date}</span></div>)}</div>
            <div className="grid min-h-10 grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-border text-xs"><span className="py-3 text-muted-foreground">all-day</span>{PREVIEW_CALENDAR_DAYS.map((day, index) => <div key={day.label} className="border-l border-border p-1">{index === 4 && <p className="rounded bg-success-soft px-1.5 py-1 font-medium text-success-content">Research milestone</p>}</div>)}</div>
            <div className="grid grid-cols-[52px_minmax(0,1fr)]"><div>{PREVIEW_CALENDAR_HOURS.map(hour => <div key={hour} className="h-14 pt-1 text-xs tabular-nums text-muted-foreground">{hour}</div>)}</div><div className="grid grid-cols-7">{PREVIEW_CALENDAR_DAYS.map((day, dayIndex) => <div key={day.label} className="relative border-l border-border"><div>{PREVIEW_CALENDAR_HOURS.map(hour => <div key={hour} className="h-14 border-b border-border"><div className="h-7 border-b border-border/40" /></div>)}</div>{PREVIEW_CALENDAR_EVENTS.filter(event => event.day === dayIndex).map(event => <CalendarEventPreview key={event.id} event={event} />)}</div>)}</div></div>
          </div>
        </div>
        <p className="flex shrink-0 items-center gap-2 pt-3 text-xs text-muted-foreground"><CalendarDays aria-hidden="true" className="size-3.5" />Personal events and project tasks</p>
      </div>
    </div>
  </PreviewShell>;
}
