"use client";

import { Trash2 } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useModalDialog } from "../../hooks/use-modal-dialog";

export function DeleteCalendarModal({
  open,
  calendarName,
  pending = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  calendarName: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef, onClose });

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-calendar-title"
        aria-describedby="delete-calendar-description"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4 p-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
            <Trash2 className="h-5 w-5 stroke-[2.2]" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              id="delete-calendar-title"
              className="text-base font-bold text-slate-900"
            >
              {intl.formatMessage({ id: "calendar.deleteCalendar" })}
            </h3>
            <p
              id="delete-calendar-description"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              {intl.formatMessage(
                { id: "calendar.deleteCalendarConfirm" },
                { name: calendarName },
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 active:scale-98 disabled:cursor-wait disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{intl.formatMessage({ id: "calendar.deleteCalendar" })}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
