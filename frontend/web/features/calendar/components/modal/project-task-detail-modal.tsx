"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Project, Task } from "@/features/project/types/project";
import { ProjectTaskFocusButton } from "@/features/pomodoro/components/task-focus-button";
import { TaskReadonlyDetails } from "@/features/project/components/task-detail/task-readonly-details";
import { TaskFocusHistory } from "@/features/pomodoro/components/task-focus-history";

export function ProjectTaskDetailModal({ task, project, onClose }: {
  task: Task;
  project: Project;
  onClose: () => void;
}) {

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-labelledby="project-task-detail-title"
        className="flex max-h-[min(92dvh,760px)] max-w-xl flex-col rounded-dialog border-border bg-card"
      >
        <div className="min-h-0 overflow-y-auto">
          <DialogHeader className="space-y-2 px-6 pb-5 pt-6">
            <DialogDescription className="flex min-w-0 items-center gap-2 pr-10 text-xs font-semibold text-muted-foreground">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="min-w-0 break-words">{project.name}</span>
              <span className="shrink-0 text-muted-foreground">/</span>
              <span className="shrink-0">#{task.taskNumber}</span>
            </DialogDescription>
            <DialogTitle id="project-task-detail-title" className="break-words pr-10 text-section-title leading-7 [overflow-wrap:anywhere]">
              {task.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 border-t border-border px-6 py-5 text-sm text-foreground">
            <div className="flex flex-col gap-4">
              <ProjectTaskFocusButton task={task} project={project} />
              <TaskFocusHistory target={{ taskId: task.id }} />
            </div>
            <TaskReadonlyDetails task={task} projectId={project.id} />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-border bg-card px-6 py-4">
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}?taskId=${task.id}`}>
              Open project
              <ExternalLink className="ml-2 size-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
