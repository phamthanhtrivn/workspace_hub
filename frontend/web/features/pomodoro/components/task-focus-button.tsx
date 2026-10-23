"use client";

import { useState } from "react";
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

export function TaskFocusButton({ target, compact = false }: { target: PomodoroActiveTask; compact?: boolean }) {
  const { startFocus, activeTask, status, busy, isReady } = usePomodoroSessionActions();
  const [starting, setStarting] = useState(false);
  const focus = async () => {
    setStarting(true);
    try {
      await startFocus(target);
    } finally {
      setStarting(false);
    }
  };
  const current = sameFocusTask(activeTask, target);
  const label = current && status === "RUNNING" ? "Focusing" : current && status === "PAUSED" ? "Resume focus" : "Start focus";
  const disabled = !isReady || busy || (current && status === "RUNNING");
  if (compact) return (
    <span data-ui-interaction-exception="Propagation boundary; the contained shared button owns activation." data-card-interactive="true" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild><Button type="button" size="sm" variant="ghost" disabled={disabled} aria-label={`Focus actions: ${target.title}`} title={label} className="size-7 rounded-control p-1 text-info-content"><Timer className="size-3.5" /></Button></PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <Button loading={starting} type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => void focus()} className="w-full justify-start gap-2 text-xs"><Timer className="size-3.5" />{label}</Button>
        </PopoverContent>
      </Popover>
    </span>
  );
  return (
    <span data-card-interactive="true" onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <Button loading={starting} type="button" size="sm" variant="outline" disabled={disabled}
        title={label} aria-label={`${label}: ${target.title}`} onClick={(event) => { event.stopPropagation(); void focus(); }}
        className="h-8 gap-1.5 rounded-control text-xs">
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
  return <TaskFocusButton target={toProjectFocusTask(task, project)} compact={compact} />;
}

export function ProjectTaskFocusButton(props: { task: Task; project?: Project; compact?: boolean }) {
  const userId = useAppSelector((state) => state.auth.userId);
  return userId ? <ProjectFocusAction {...props} /> : null;
}

export function CalendarTaskFocusButton({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const userId = useAppSelector((state) => state.auth.userId);
  if (!userId || !isCalendarFocusEligible(event, userId)) return null;
  return <TaskFocusButton target={toCalendarFocusTask(event)} compact={compact} />;
}
