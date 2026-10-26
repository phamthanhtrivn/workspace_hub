"use client";

import { CalendarDays, Check, Circle, CircleDashed, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Project, Task } from "@/features/project/types/project";
import { readableTextOnColor } from "@/lib/color";
import { cn } from "@/lib/utils";
import { POMODORO_TASK_COPY as copy } from "../constants/pomodoro-task";
import { isProjectFocusOverdue, sameFocusTask, toProjectFocusTask } from "../utils/focus-task";
import { formatPomodoroProjectTaskSchedule } from "../utils/pomodoro-task-schedule";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { ProjectTaskFocusButton } from "./task-focus-button";

export function PomodoroProjectTaskItem({ task, project }: { task: Task; project: Project }) {
  const { activeTask } = usePomodoroSessionActions();
  const current = sameFocusTask(activeTask, toProjectFocusTask(task, project));
  const inProgress = task.status === "IN_PROGRESS";
  const StatusIcon = inProgress ? CircleDashed : Circle;
  const schedule = formatPomodoroProjectTaskSchedule(task);

  return <li aria-current={current || undefined} className={cn(
    "@container/focus-row rounded-control border p-3 transition-colors motion-reduce:transition-none",
    current ? "border-info-outline bg-info-soft/40" : "border-border bg-card hover:border-input",
  )}>
    <div className="flex min-w-0 flex-wrap items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-control"
        style={{ backgroundColor: project.color, color: readableTextOnColor(project.color) }}>
        <FolderKanban className="size-4" />
      </span>
      <div className="min-w-0 flex-1 basis-[calc(100%-2.75rem)] @min-[500px]/focus-row:basis-0">
        <p title={task.title} className="truncate text-sm font-semibold leading-snug text-foreground">{task.title}</p>
        <p title={project.name} className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {task.taskNumber > 0 && <span className="shrink-0 font-medium tabular-nums">TASK-{task.taskNumber}</span>}
          <span className="truncate">{project.name}</span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className={cn("gap-1 font-medium", inProgress && "bg-info-soft text-info-content")}>
            <StatusIcon aria-hidden="true" />{inProgress ? copy.inProgress : copy.toDo}
          </Badge>
          {isProjectFocusOverdue(task) && <Badge variant="secondary" className="bg-warning-soft font-medium text-warning-content">{copy.overdue}</Badge>}
          {current && <Badge variant="outline" className="border-info-outline font-medium text-info-content"><Check aria-hidden="true" />{copy.currentTask}</Badge>}
        </div>
        <p title={schedule} className="mt-2 flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-muted-foreground tabular-nums">
          <CalendarDays aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /><span className="min-w-0 break-words">{schedule}</span>
        </p>
      </div>
      <div className="flex w-full justify-end border-t border-border/60 pt-2 @min-[500px]/focus-row:w-auto @min-[500px]/focus-row:self-center @min-[500px]/focus-row:border-t-0 @min-[500px]/focus-row:pt-0">
        <ProjectTaskFocusButton task={task} project={project} />
      </div>
    </div>
  </li>;
}
