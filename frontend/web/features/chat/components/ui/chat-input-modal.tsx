"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatInputModalProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  errorMessage?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function ChatInputModal({
  open,
  title,
  description,
  placeholder = "",
  defaultValue = "",
  confirmLabel,
  cancelLabel = "Cancel",
  icon: Icon = MessageSquare,
  isLoading = false,
  errorMessage,
  onConfirm,
  onCancel,
}: ChatInputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError(errorMessage || "This field is required");
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isLoading && onCancel()}>
      <DialogContent
        className="max-w-md border-slate-100 bg-white p-6 text-slate-800 shadow-2xl rounded-3xl"
        showCloseButton={!isLoading}
      >
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#0052CC] ring-1 ring-blue-100">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-black text-slate-800">
              {title}
            </DialogTitle>
            {description ? (
              <p className="mt-0.5 text-xs font-bold text-slate-400">{description}</p>
            ) : null}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={placeholder}
              disabled={isLoading}
              className={cn(
                "h-11 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-hidden",
                error && "border-red-400 focus-visible:ring-red-400"
              )}
            />
            {error ? (
              <p className="mt-1.5 text-xs font-bold text-red-500">{error}</p>
            ) : null}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={onCancel}
              className="h-10 cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !value.trim()}
              className="h-10 cursor-pointer rounded-2xl bg-[#0052CC] hover:bg-[#0043A8] px-5 text-xs font-bold text-white shadow-md shadow-blue-500/10 disabled:opacity-50"
            >
              {isLoading ? "..." : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ChatInputModal;
