"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

import React from "react";

import { Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogSurface } from "@/components/ui/dialog";


interface StartMeetingConfirmModalProps {
  isOpen: boolean;
  isCreating?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetName?: string;
}

export function StartMeetingConfirmModal({
  isOpen,
  isCreating = false,
  onClose,
  onConfirm,
  targetName,
}: StartMeetingConfirmModalProps) {
  const portalRoot = typeof document === "undefined" ? null : document.body;

  if (!isOpen || !portalRoot) return null;

  return <DialogSurface onClose={() => { if (!isCreating) onClose(); }}>{<div


      className="fixed inset-0 z-[150] grid place-items-center bg-overlay/40 p-4 transition-all duration-200 animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isCreating) {
          onClose();
        }
      }}
    >
      <div className={`${dialogLayout.surface} w-full max-w-md rounded-panel border border-border bg-card p-6 transition-all animate-in zoom-in-95 duration-150`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-panel bg-info-soft text-info-content border border-border">
            <Video className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-semibold text-foreground leading-snug">
              Start Video Meeting
            </h3>
            <p className="mt-1.5 text-xs md:text-sm font-medium leading-relaxed text-muted-foreground">
              {targetName
                ? `Are you sure you want to start a meeting with ${targetName}?`
                : "Are you sure you want to start a video meeting?"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary"
            type="button"
            disabled={isCreating}
            onClick={onClose}
            className="cursor-pointer rounded-control px-4 py-2.5 text-xs md:text-sm font-semibold transition focus-visible:outline-none disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button variant="default"
            type="button"
            disabled={isCreating}
            onClick={onConfirm}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-control px-5 py-2.5 text-xs md:text-sm font-semibold active:bg-primary transition focus-visible:outline-none disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            <span>Start Meeting</span>
          </Button>
        </div>
      </div>
    </div>}</DialogSurface>;
}

export default StartMeetingConfirmModal;

