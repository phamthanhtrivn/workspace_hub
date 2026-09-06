"use client";

import { MessageCircle } from "lucide-react";
import type { Task } from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";

export default function TaskChatButton({
  task,
  onOpenChat,
  compact = false,
}: {
  task: Task;
  onOpenChat?: (task: Task) => void;
  compact?: boolean;
}) {
  const intl = useAppIntl();

  if (!onOpenChat) return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenChat(task);
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 ${compact ? "p-1" : "px-1.5 py-1"}`}
      title={intl.formatMessage({ id: "project.task.openChat" })}
      aria-label={intl.formatMessage(
        { id: "project.task.openChatFor" },
        { title: task.title },
      )}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {!compact && (
        <span className="hidden 2xl:inline text-[10px] font-bold">
          {intl.formatMessage({ id: "project.task.chat" })}
        </span>
      )}
    </button>
  );
}
