"use client";

import { MessageCircle, MessageSquare, ExternalLink } from "lucide-react";
import {
  isTerminalTaskStatus,
  type ProjectMember,
  type Task,
} from "@/features/project/types/project";
import TaskCommentsSection from "../task-detail/task-comments-section";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TaskChatDialog({
  task,
  members,
  canComment,
  onClose,
  onOpenTaskChannel,
  onOpenTaskThread,
  isOpeningChannel = false,
}: {
  task: Task | null;
  members: ProjectMember[];
  canComment: boolean;
  onClose: () => void;
  onOpenTaskChannel?: () => void;
  onOpenTaskThread?: () => void;
  isOpeningChannel?: boolean;
}) {
  if (!task) return null;

  const handleChatClick = () => {
    if (onOpenTaskThread) {
      onOpenTaskThread();
    } else if (onOpenTaskChannel) {
      onOpenTaskChannel();
    }
  };

  return (
    <Dialog open={Boolean(task)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-w-lg flex-col p-0 gap-0 overflow-hidden rounded-dialog border-border bg-card sm:rounded-dialog">
        <DialogHeader className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-5 pt-5 pb-4 pr-12 text-left border-b border-border">
          <div className="min-w-0 max-w-full">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <MessageCircle size={15} className="text-info" />
              <span>Task Discussion</span>
            </div>
            <DialogTitle className="mt-1 truncate text-base font-semibold text-foreground">
              {task.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Discussion and activity comments for task {task.title}
            </DialogDescription>
          </div>
          {(onOpenTaskThread || onOpenTaskChannel) && (
            <button
              type="button"
              disabled={isOpeningChannel}
              onClick={handleChatClick}
              className="inline-flex items-center gap-1.5 rounded-control bg-info-soft px-3 py-1.5 text-xs font-semibold text-info hover:bg-info-soft transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
              title="Open real-time discussion thread in Space Chat"
            >
              <MessageSquare size={13} />
              <span>{isOpeningChannel ? "Opening..." : "Thread in Space"}</span>
              <ExternalLink size={12} className="opacity-70" />
            </button>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <TaskCommentsSection
            key={task.id}
            task={task}
            members={members}
            isReadOnly={!canComment || isTerminalTaskStatus(task.status)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
