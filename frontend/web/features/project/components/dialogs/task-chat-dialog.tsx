"use client";

import { MessageCircle } from "lucide-react";
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
}: {
  task: Task | null;
  members: ProjectMember[];
  canComment: boolean;
  onClose: () => void;
}) {
  if (!task) return null;
  return (
    <Dialog open={Boolean(task)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 text-left border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <MessageCircle size={15} className="text-[#0052CC]" />
            <span>Task Comments</span>
          </div>
          <DialogTitle className="mt-1 truncate text-base font-bold text-slate-900">
            {task.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Discussion and activity comments for task {task.title}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto px-6 py-4 max-h-[calc(100dvh-16rem)]">
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
