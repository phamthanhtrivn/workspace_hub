"use client";

import { useState } from "react";
import { CalendarDays, FolderKanban, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFocusTaskOptions } from "../hooks/use-focus-task-options";
import { focusTaskSource } from "../utils/focus-task";
import { POMODORO_FOCUS_SOURCES } from "../constants/pomodoro-task";
import type { PomodoroFocusSource } from "../types/pomodoro";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { PomodoroCalendarTaskPanel } from "./pomodoro-calendar-task-panel";
import { PomodoroProjectTaskPanel } from "./pomodoro-project-task-panel";
import type { PomodoroTaskFilters } from "./pomodoro-task-filters";

const SOURCE_ICONS = { free: Timer, calendar: CalendarDays, project: FolderKanban };

export function PomodoroTaskPicker({ open, onCreateCalendarTask, initialSource }: {
  open: boolean;
  onCreateCalendarTask: () => void;
  initialSource?: PomodoroFocusSource;
}) {
  const { activeTask, focusRevision, startFreeFocus, status, busy, isReady } = usePomodoroSessionActions();
  const focusContext = `${focusRevision}:${activeTask?.id ?? "free"}`;
  const [selection, setSelection] = useState<{ context: string; source: PomodoroFocusSource } | null>(null);
  const source = selection?.context === focusContext ? selection.source : initialSource ?? focusTaskSource(activeTask);
  const [calendarFilters, setCalendarFilters] = useState<PomodoroTaskFilters>({ scope: "today", search: "" });
  const [projectFilters, setProjectFilters] = useState<PomodoroTaskFilters>({ scope: "today", search: "" });
  const [projectId, setProjectId] = useState("");
  const { userId, calendar, project } = useFocusTaskOptions(source, open);

  return (
    <section hidden={!open} aria-label="Choose your focus">
      <Tabs value={source} onValueChange={(value) => {
        const next = POMODORO_FOCUS_SOURCES.find((candidate) => candidate.value === value);
        if (next) setSelection({ context: focusContext, source: next.value });
      }} className="gap-5">
        <TabsList aria-label="Focus source" className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {POMODORO_FOCUS_SOURCES.map(({ value, label }) => {
            const Icon = SOURCE_ICONS[value];
            return <TabsTrigger key={value} value={value} className="h-auto min-h-10 min-w-0 whitespace-normal rounded-lg px-1 py-2 text-[11px] leading-snug data-[state=active]:text-blue-800 sm:gap-2 sm:text-xs">
              <Icon className="hidden size-3.5 shrink-0 sm:block" />{label}
            </TabsTrigger>;
          })}
        </TabsList>
        <TabsContent value="free" className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Timer className="size-4 text-blue-700" />Free focus</div>
            <p className="text-xs leading-relaxed text-slate-500">Start a focus session without a Calendar or Project task. Your focus time will still be saved.</p>
          </div>
          <Button className="w-full" disabled={!isReady || busy} onClick={() => void startFreeFocus()}>
            {!activeTask && status === "PAUSED" ? "Resume free focus" : !activeTask && status === "RUNNING" ? "Continue free focus" : "Start free focus"}
          </Button>
        </TabsContent>
        <TabsContent value="calendar" forceMount hidden={source !== "calendar"}>
          <PomodoroCalendarTaskPanel tasks={calendar.data ?? []} userId={userId ?? ""} onCreateTask={onCreateCalendarTask}
            filters={calendarFilters} onFiltersChange={setCalendarFilters} isLoading={calendar.isLoading} isError={calendar.isError} onRetry={() => void calendar.refetch()} />
        </TabsContent>
        <TabsContent value="project">
          <PomodoroProjectTaskPanel tasks={project.data ?? []} userId={userId ?? ""} filters={projectFilters} onFiltersChange={setProjectFilters}
            projectId={projectId} onProjectChange={setProjectId} isLoading={project.isLoading} isError={project.isError} onRetry={() => void project.refetch()} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
