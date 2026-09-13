"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Video, Loader2 } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

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
  const intl = useAppIntl();
  const portalRoot = typeof document === "undefined" ? null : document.body;

  if (!isOpen || !portalRoot) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm transition-all duration-200 animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isCreating) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Video className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {intl.formatMessage({ id: "chat.meeting.confirmTitle" })}
            </h3>
            <p className="mt-1.5 text-xs md:text-sm font-medium leading-relaxed text-slate-600">
              {targetName
                ? intl.formatMessage(
                    { id: "chat.meeting.confirmDescriptionWithTarget" },
                    { target: targetName },
                  )
                : intl.formatMessage({ id: "chat.meeting.confirmDescription" })}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isCreating}
            onClick={onClose}
            className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition focus-visible:outline-none disabled:opacity-50"
          >
            {intl.formatMessage({ id: "chat.meeting.confirmCancel" })}
          </button>
          <button
            type="button"
            disabled={isCreating}
            onClick={onConfirm}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs md:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 transition focus-visible:outline-none disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Video className="h-4 w-4" />
            )}
            <span>
              {intl.formatMessage({ id: "chat.meeting.confirmStart" })}
            </span>
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}

export default StartMeetingConfirmModal;
