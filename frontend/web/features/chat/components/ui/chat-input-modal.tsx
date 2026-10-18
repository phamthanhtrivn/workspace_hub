"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

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
        className={`${dialogLayout.surface} max-w-md border-border bg-card p-6 text-foreground rounded-dialog`}
        showCloseButton={!isLoading}
      >
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-panel bg-info-soft text-info-content ring-1 ring-ring">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold text-foreground">
              {title}
            </DialogTitle>
            {description ? (
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{description}</p>
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
                "h-11 rounded-control border border-input bg-background px-4 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden",
                error && "border-destructive-outline focus-visible:ring-ring"
              )}
            />
            {error ? (
              <p className="mt-1.5 text-xs font-semibold text-destructive-content">{error}</p>
            ) : null}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isLoading}
              onClick={onCancel}
              className="h-10 cursor-pointer rounded-control border border-border bg-card px-5 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !value.trim()}
              className="h-10 cursor-pointer rounded-control bg-primary hover:bg-primary-hover px-5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
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
