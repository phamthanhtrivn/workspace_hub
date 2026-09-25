"use client";

import Link from "next/link";
import { Check, ExternalLink, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProjectMembers } from "@/features/project/hooks/use-projects";
import { Avatar } from "@/features/project/components/ui/avatar-stack";
import { TaskPriority, TaskStatus, type Project, type ProjectMember, type Task } from "@/features/project/types/project";
import { taskDateKey } from "@/features/project/utils/task-dates";

const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "To do",
  [TaskStatus.IN_PROGRESS]: "In progress",
  [TaskStatus.IN_REVIEW]: "In review",
  [TaskStatus.DONE]: "Done",
  [TaskStatus.CANCELLED]: "Cancelled",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: "Low",
  [TaskPriority.MEDIUM]: "Medium",
  [TaskPriority.HIGH]: "High",
  [TaskPriority.URGENT]: "Urgent",
};

const MEMBER_CACHE_STALE_TIME_MS = 5 * 60 * 1000;

function formatTaskTime(value: string, allDay: boolean) {
  if (allDay) {
    const key = taskDateKey(value, true);
    return new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  return new Date(value).toLocaleString("en-US", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function MemberName({ member, fallback }: { member?: ProjectMember; fallback: string }) {
  if (!member) return <span className="text-slate-500">{fallback}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar user={member} size="xs" />
      <span className="min-w-0 break-words">{member.displayName}</span>
    </span>
  );
}

export function ProjectTaskDetailModal({ task, project, onClose }: {
  task: Task;
  project: Project;
  onClose: () => void;
}) {
  const membersQuery = useProjectMembers(project.id, {
    enabled: task.assignees.length > 0 || Boolean(task.reporterId),
    staleTime: MEMBER_CACHE_STALE_TIME_MS,
  });
  const membersById = new Map((membersQuery.data ?? []).map((member) => [member.userId, member]));
  const memberFallback = membersQuery.isPending
    ? "Loading members..."
    : "Member information unavailable";
  const completedChecklistCount = task.checklists.filter((entry) => entry.completed).length;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-labelledby="project-task-detail-title"
        className="flex max-h-[min(92dvh,760px)] max-w-xl flex-col rounded-2xl border-slate-200 bg-white"
      >
        <div className="min-h-0 overflow-y-auto">
          <DialogHeader className="space-y-2 px-6 pb-5 pt-6">
            <DialogDescription className="flex min-w-0 items-center gap-2 pr-10 text-xs font-semibold text-slate-500">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              <span className="min-w-0 break-words">{project.name}</span>
              <span className="shrink-0 text-slate-300">/</span>
              <span className="shrink-0">#{task.taskNumber}</span>
            </DialogDescription>
            <DialogTitle id="project-task-detail-title" className="break-words pr-10 text-xl leading-7 [overflow-wrap:anywhere]">
              {task.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 border-t border-slate-100 px-6 py-5 text-sm text-slate-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Status</p>
                <p className="font-semibold text-slate-800">{STATUS_LABELS[task.status]}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Priority</p>
                <p className="font-semibold text-slate-800">{PRIORITY_LABELS[task.priority]}</p>
              </div>
            </div>

            {task.startDate && task.dueDate && (
              <section className="border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">Time</h3>
                  {task.allDay && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">All day</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Start date</p>
                    <p className="font-medium text-slate-800">{formatTaskTime(task.startDate, task.allDay)}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">End date</p>
                    <p className="font-medium text-slate-800">{formatTaskTime(task.dueDate, task.allDay)}</p>
                  </div>
                </div>
                {task.completedAt && <p className="mt-3 text-xs text-slate-500">Completed at: {formatTaskTime(task.completedAt, false)}</p>}
              </section>
            )}

            <section className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              <div className="min-w-0">
                <h3 className="mb-2 text-xs font-medium text-slate-500">Assignees</h3>
                {task.assignees.length ? (
                  <ul className="space-y-2">
                    {task.assignees.map((assignee) => (
                      <li key={assignee.id} className="min-w-0">
                        <MemberName member={membersById.get(assignee.userId)} fallback={memberFallback} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500">Unassigned</p>}
              </div>
              {task.reporterId && (
                <div className="min-w-0">
                  <h3 className="mb-2 text-xs font-medium text-slate-500">Reporter</h3>
                  <MemberName member={membersById.get(task.reporterId)} fallback={memberFallback} />
                </div>
              )}
            </section>

            {(task.labels.length > 0 || task.estimatedMinutes > 0) && (
              <section className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
                {task.labels.length > 0 && (
                  <div className="min-w-0">
                    <h3 className="mb-2 text-xs font-medium text-slate-500">Labels</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {task.labels.map((label) => (
                        <span key={label.id} className="max-w-full break-words rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                          <span className="mr-1.5 inline-block size-2 rounded-full" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {task.estimatedMinutes > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-slate-500">Estimate</h3>
                    <p className="font-medium text-slate-800">{task.estimatedMinutes} min</p>
                  </div>
                )}
              </section>
            )}

            {task.description.trim() && (
              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-2 font-semibold text-slate-900">Description</h3>
                <p className="whitespace-pre-wrap break-words leading-6 [overflow-wrap:anywhere]">{task.description}</p>
              </section>
            )}

            {task.checklists.length > 0 && (
              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-3 font-semibold text-slate-900">Checklist ({completedChecklistCount}/{task.checklists.length})</h3>
                <ul className="space-y-2">
                  {task.checklists.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2">
                      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${entry.completed ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                        {entry.completed && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{entry.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {task.documentAttachments.length > 0 && (
              <section className="border-t border-slate-100 pt-5">
                <h3 className="mb-3 font-semibold text-slate-900">Attached documents ({task.documentAttachments.length})</h3>
                <ul className="space-y-2">
                  {task.documentAttachments.map((attachment) => (
                    <li key={attachment.id} className="flex min-w-0 items-start gap-2">
                      <Paperclip className="mt-0.5 size-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{attachment.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-slate-100 bg-white px-6 py-4">
          <Button asChild variant="outline">
            <Link href={`/projects/${project.id}`}>
              Open project
              <ExternalLink className="ml-2 size-4" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
