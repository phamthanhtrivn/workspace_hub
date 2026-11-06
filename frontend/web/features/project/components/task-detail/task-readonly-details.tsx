"use client";

import { Check, Paperclip } from "lucide-react";
import { useProjectMembers } from "@/features/project/hooks/use-projects";
import { Avatar } from "../ui/avatar-stack";
import { TaskStatusBadge, TaskPriorityBadge } from "../ui/status-badge";
import { taskDateKey } from "@/features/project/utils/task-dates";
import type { ProjectMember, Task } from "@/features/project/types/project";

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
  if (!member) return <span className="text-muted-foreground">{fallback}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar user={member} size="xs" />
      <span className="min-w-0 break-words">{member.displayName}</span>
    </span>
  );
}

export function TaskReadonlyDetails({ task, projectId }: { task: Task; projectId: string }) {
  const membersQuery = useProjectMembers(projectId, {
    enabled: task.assignees.length > 0 || Boolean(task.reporterId),
    staleTime: MEMBER_CACHE_STALE_TIME_MS,
  });
  const membersById = new Map((membersQuery.data ?? []).map((member) => [member.userId, member]));
  const memberFallback = membersQuery.isPending
    ? "Loading members..."
    : "Member information unavailable";
  const completedChecklistCount = task.checklists.filter((entry) => entry.completed).length;

  return <div className="space-y-5 text-sm text-foreground">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Status</p>
        <div>
          <TaskStatusBadge status={task.status} />
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Priority</p>
        <div>
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </div>
    </div>

    {(task.startDate || task.dueDate) && (
      <section className="border-t border-border pt-5">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="font-semibold text-foreground">Time</h3>
          {task.allDay && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">All day</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Start date</p>
            <p className="font-medium text-foreground">{task.startDate ? formatTaskTime(task.startDate, task.allDay) : "Not set"}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">End date</p>
            <p className="font-medium text-foreground">{task.dueDate ? formatTaskTime(task.dueDate, task.allDay) : "Not set"}</p>
          </div>
        </div>
        {task.completedAt && <p className="mt-3 text-xs text-muted-foreground">Completed at: {formatTaskTime(task.completedAt, false)}</p>}
      </section>
    )}

    <section className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
      <div className="min-w-0">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">Assignees</h3>
        {task.assignees.length ? (
          <ul className="space-y-2">
            {task.assignees.map((assignee) => (
              <li key={assignee.id} className="min-w-0">
                <MemberName member={membersById.get(assignee.userId)} fallback={memberFallback} />
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">Unassigned</p>}
      </div>
      {task.reporterId && (
        <div className="min-w-0">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Reporter</h3>
          <MemberName member={membersById.get(task.reporterId)} fallback={memberFallback} />
        </div>
      )}
    </section>

    {task.labels.length > 0 && (
      <section className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        {task.labels.length > 0 && (
          <div className="min-w-0">
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">Labels</h3>
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <span key={label.id} className="max-w-full break-words rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                  <span className="mr-1.5 inline-block size-2 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    )}

    {task.description.trim() && (
      <section className="border-t border-border pt-5">
        <h3 className="mb-2 font-semibold text-foreground">Description</h3>
        <p className="whitespace-pre-wrap break-words leading-6 [overflow-wrap:anywhere]">{task.description}</p>
      </section>
    )}

    {task.checklists.length > 0 && (
      <section className="border-t border-border pt-5">
        <h3 className="mb-3 font-semibold text-foreground">Checklist ({completedChecklistCount}/{task.checklists.length})</h3>
        <ul className="space-y-2">
          {task.checklists.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2">
              <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border ${entry.completed ? "border-info-outline bg-primary text-primary-foreground" : "border-input"}`}>
                {entry.completed && <Check className="size-3" />}
              </span>
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{entry.title}</span>
            </li>
          ))}
        </ul>
      </section>
    )}

    {task.documentAttachments.length > 0 && (
      <section className="border-t border-border pt-5">
        <h3 className="mb-3 font-semibold text-foreground">Attached documents ({task.documentAttachments.length})</h3>
        <ul className="space-y-2">
          {task.documentAttachments.map((attachment) => (
            <li key={attachment.id} className="flex min-w-0 items-start gap-2">
              <Paperclip className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{attachment.name}</span>
            </li>
          ))}
        </ul>
      </section>
    )}
  </div>;
}
