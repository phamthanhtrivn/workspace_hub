import { Check, FileText, Timer } from "lucide-react";
import { PREVIEW_FOCUS_MINUTES, PREVIEW_TASK } from "../../landing-content";
import { PreviewHeading, PreviewShell } from "./preview-shell";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const WEEK_EVENTS = [
  { day: "Mon", title: "Review interview findings", time: "09:00", position: "mt-3", tone: "bg-primary-soft text-primary-soft-foreground" },
  { day: "Tue", title: PREVIEW_TASK, time: "10:00", position: "mt-16", tone: "bg-primary-soft text-primary-soft-foreground" },
  { day: "Wed", title: "Prototype review", time: "14:00", position: "mt-24", tone: "bg-warning-soft text-warning-content" },
  { day: "Thu", title: "Write evaluation plan", time: "09:30", position: "mt-8", tone: "bg-primary-soft text-primary-soft-foreground" },
  { day: "Fri", title: "Submit research brief", time: "16:00", position: "mt-36", tone: "bg-success-soft text-success-content" },
] as const;

export function CalendarPreview() {
  return <PreviewShell moduleId="calendar">
    <PreviewHeading title="Your week, in view." subtitle="Project deadlines and personal plans, together."><span className="hidden text-xs text-muted-foreground sm:block">Week view</span></PreviewHeading>
    <div className="grid h-[255px] grid-cols-3 divide-x divide-border overflow-hidden rounded-control border border-border sm:h-[285px] sm:grid-cols-5">
      {WEEKDAYS.map((day, index) => <div key={day} className={index > 2 ? "hidden min-w-0 sm:block" : "min-w-0"}><div className="border-b border-border p-2 text-center text-xs font-medium">{day}</div><div className="px-1.5">{WEEK_EVENTS.filter((event) => event.day === day).map((event) => <div key={event.title} className={`rounded-sm p-2 text-[10px] leading-4 ${event.position} ${event.tone}`}><p className="font-semibold">{event.time}</p><p className="mt-1">{event.title}</p></div>)}</div></div>)}
    </div>
  </PreviewShell>;
}

export function PomodoroPreview() {
  return <PreviewShell moduleId="pomodoro">
    <PreviewHeading title="One task. Your full attention." subtitle="A focus session connected to your project." />
    <div className="grid items-center gap-5 sm:grid-cols-2">
      <div className="flex flex-col items-center justify-center sm:py-4"><span className="mb-3 text-xs font-medium text-link">Focus session</span><div className="flex size-40 flex-col items-center justify-center rounded-full border-4 border-primary-outline sm:size-48"><p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{PREVIEW_FOCUS_MINUTES}:00</p><p className="mt-2 text-xs text-muted-foreground">Ready when you are</p></div><p className="mt-3 text-[10px] text-muted-foreground">Static timer illustration</p></div>
      <div className="border-t border-border pt-4 sm:border-t-0 sm:pt-0"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Timer aria-hidden="true" className="size-3.5" />Selected project task</div><p className="text-sm font-semibold">{PREVIEW_TASK}</p><div className="mt-4 hidden space-y-3 text-xs text-muted-foreground sm:block"><p className="flex items-center gap-2"><Check aria-hidden="true" className="size-3.5 text-success-content" />Review the research brief</p><p className="flex items-center gap-2"><span className="size-3 rounded-sm border border-input" />Build the first interaction</p><p className="flex items-center gap-2"><FileText aria-hidden="true" className="size-3.5" />Research brief.pdf</p></div></div>
    </div>
  </PreviewShell>;
}
