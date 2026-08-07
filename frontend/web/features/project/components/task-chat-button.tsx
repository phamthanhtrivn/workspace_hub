"use client";

import { MessageCircle } from "lucide-react";
import type { Task } from "@/features/project/types/project";

export default function TaskChatButton({
  task,
  onOpenChat,
  compact = false,
}: {
  task: Task;
  onOpenChat?: (task: Task) => void;
  compact?: boolean;
}) {
  if (!onOpenChat) return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenChat(task);
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 ${compact ? "p-1" : "px-1.5 py-1"}`}
      title="Mở chat task"
      aria-label={`Mở chat cho ${task.title}`}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {!compact && (
        <span className="hidden 2xl:inline text-[10px] font-bold">Chat</span>
      )}
    </button>
  );
}
