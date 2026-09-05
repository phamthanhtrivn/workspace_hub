"use client";

import { MessageCircle, X } from "lucide-react";
import { isTerminalTaskStatus, type ProjectMember, type Task } from "../types/project";
import TaskCommentsSection from "./task-comments-section";

export default function TaskChatDialog({ task, members, canComment, onClose }: {
  task: Task | null;
  members: ProjectMember[];
  canComment: boolean;
  onClose: () => void;
}) {
  if (!task) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
    onClick={onClose} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="task-chat-title"
      className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0"><p className="flex items-center gap-2 text-xs text-slate-500"><MessageCircle size={16} />Trao đổi công việc</p>
          <h2 id="task-chat-title" className="truncate font-bold text-slate-800">{task.title}</h2></div>
        <button type="button" autoFocus onClick={onClose} aria-label="Đóng trao đổi" className="p-2 text-slate-500"><X size={18} /></button>
      </div>
      <div className="overflow-y-auto p-4">
        <TaskCommentsSection key={task.id} task={task} members={members} isReadOnly={!canComment || isTerminalTaskStatus(task.status)} />
      </div>
    </div>
  </div>;
}
