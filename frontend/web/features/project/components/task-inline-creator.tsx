"use client";

import { useState } from "react";
import { CheckSquare2, Plus } from "lucide-react";

interface TaskInlineCreatorProps {
  placeholder?: string;
  buttonLabel?: string;
  onSubmit: (title: string) => Promise<void> | void;
}

export default function TaskInlineCreator({
  placeholder = "Bạn cần làm gì?",
  buttonLabel = "Create",
  onSubmit,
}: TaskInlineCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setTitle("");
      // Keep creator open for rapid successive additions
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOpen) {
    return (
      <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-2">
        <CheckSquare2 className="h-4 w-4 shrink-0 text-[#0052CC] fill-[#DEEBFF]" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleSubmit();
            } else if (e.key === "Escape") {
              setIsOpen(false);
              setTitle("");
            }
          }}
          className="flex-1 bg-transparent text-sm font-medium text-[#172B4D] outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!title.trim() || isSubmitting}
          className={`rounded px-3 py-1.5 text-xs font-bold transition ${
            title.trim() && !isSubmitting
              ? "bg-[#0052CC] text-white hover:bg-[#0747A6]"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          }`}
        >
          {isSubmitting ? "..." : "Tạo"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setTitle("");
          }}
          className="rounded px-2.5 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
        >
          Hủy
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setIsOpen(true);
        setTitle("");
      }}
      className="flex w-full items-center gap-1.5 border-t border-slate-150 bg-white px-4 py-2.5 text-left text-xs font-semibold text-slate-500 transition hover:bg-[#F4F5F7] hover:text-[#0052CC]"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span>{buttonLabel}</span>
    </button>
  );
}
