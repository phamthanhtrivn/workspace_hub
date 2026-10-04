"use client";

import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppSelector } from "@/store/store";
import { useProject } from "@/features/project/hooks/use-projects";
import type { Task, Project } from "@/features/project/types/project";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { isProjectFocusActive, isProjectFocusEligible, isCalendarFocusEligible, toCalendarFocusTask, toProjectFocusTask, sameFocusTask } from "../utils/focus-task";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";

function FocusButton({ target, compact = false }: { target: PomodoroActiveTask; compact?: boolean }) {
  const { startFocus, activeTask, status, busy, isReady } = usePomodoroSessionActions();
  const current = sameFocusTask(activeTask, target);
  const label = current && status === "RUNNING" ? "Focusing" : current && status === "PAUSED" ? "Resume focus" : "Start focus";
  const disabled = !isReady || busy || (current && status === "RUNNING");
  if (compact) return (
    <span data-card-interactive="true" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild><Button type="button" size="sm" variant="ghost" disabled={disabled} aria-label={`Focus actions: ${target.title}`} title={label} className="size-7 rounded-md p-1 text-blue-700"><Timer className="size-3.5" /></Button></PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => void startFocus(target)} className="w-full justify-start gap-2 text-xs"><Timer className="size-3.5" />{label}</Button>
        </PopoverContent>
      </Popover>
    </span>
  );
  return (
    <span data-card-interactive="true" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <Button type="button" size="sm" variant="outline" disabled={disabled}
        title={label} aria-label={`${label}: ${target.title}`} onClick={(event) => { event.stopPropagation(); void startFocus(target); }}
        className="h-8 gap-1.5 rounded-lg text-xs">
        <Timer className="size-3.5" />{label}
      </Button>
    </span>
  );
}

function ProjectFocusAction({ task, project: suppliedProject, compact }: { task: Task; project?: Project; compact?: boolean }) {
  const userId = useAppSelector((state) => state.auth.userId);
  const { data: queriedProject } = useProject(suppliedProject ? "" : task.projectId);
  const project = suppliedProject ?? queriedProject;
  if (!userId || !project || !isProjectFocusActive(project) || !isProjectFocusEligible(task, userId)) return null;
  return <FocusButton target={toProjectFocusTask(task, project)} compact={compact} />;
}

export function ProjectTaskFocusButton(props: { task: Task; project?: Project; compact?: boolean }) {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <ProjectFocusAction {...props} /> : null;
}

export function CalendarTaskFocusButton({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const userId = useAppSelector((state) => state.auth.userId);
  if (!userId || !isCalendarFocusEligible(event, userId)) return null;
  return <FocusButton target={toCalendarFocusTask(event)} compact={compact} />;
}
