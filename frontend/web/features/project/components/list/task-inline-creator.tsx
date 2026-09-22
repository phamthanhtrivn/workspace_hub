"use client";

import { useState } from "react";
import { CheckSquare2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaskInlineCreatorProps {
  placeholder?: string;
  buttonLabel?: string;
  onSubmit: (title: string) => Promise<void> | void;
  initialOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  onCancel?: () => void;
  onCreated?: () => void;
}

export default function TaskInlineCreator({
  placeholder,
  buttonLabel,
  onSubmit,
  initialOpen = false,
  className,
  buttonClassName,
  onCancel,
  onCreated,
}: TaskInlineCreatorProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = () => {
    setIsOpen(false);
    setTitle("");
    onCancel?.();
  };

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setTitle("");
      setIsSubmitting(false);
      onCreated?.();
    } catch (error) {
      setIsSubmitting(false);
      throw error;
    }
  };

  if (isOpen) {
    return (
      <div
        className={`flex items-center gap-2.5 border-t border-slate-200 bg-white px-4 py-2 ${
          className ?? ""
        }`}
      >
        <CheckSquare2 className="h-4 w-4 shrink-0 text-[#0052CC] fill-[#DEEBFF]" />
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder ?? "What needs to be done?"}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleSubmit();
            } else if (e.key === "Escape") {
              handleCancel();
            }
          }}
          className="h-8 flex-1 border-slate-200 bg-transparent text-xs font-semibold text-[#172B4D] placeholder:text-slate-400"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={!title.trim() || isSubmitting}
          className="h-8 rounded-lg bg-[#0052CC] hover:bg-[#0747A6] px-3 text-xs font-bold text-white cursor-pointer"
        >
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="h-8 rounded-lg border-slate-200 px-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => {
        setIsOpen(true);
        setTitle("");
      }}
      className={`flex h-9 w-full justify-start rounded-none items-center gap-1.5 border-t border-slate-200 bg-white px-4 py-2.5 text-left text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-[#0052CC] cursor-pointer ${
        buttonClassName ?? ""
      }`}
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span>{buttonLabel ?? "Create Task"}</span>
    </Button>
  );
}
