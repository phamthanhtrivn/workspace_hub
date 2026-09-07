"use client";

import { X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useCreateCalendar } from "../../hooks/use-calendar-queries";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { CALENDAR_DEFAULT_EVENT_COLOR } from "../../types/calendar.constants";
import {
  CalendarColorPicker,
  CalendarIconPicker,
} from "../sidebar/calendar-style-fields";

export function CreateCalendarModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLFormElement>(null);
  const createCalendar = useCreateCalendar();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState<string>(CALENDAR_DEFAULT_EVENT_COLOR);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const previewName =
    name.trim() || intl.formatMessage({ id: "calendar.calendarNamePlaceholder" });
  useModalDialog({ dialogRef, onClose });

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error(intl.formatMessage({ id: "calendar.nameRequired" }));
      return;
    }

    try {
      await createCalendar.mutateAsync({
        name: name.trim(),
        icon: icon || null,
        color,
        isVisible: true,
      });
      setName("");
      setIcon(null);
      setColor(CALENDAR_DEFAULT_EVENT_COLOR);
      setShowCustomColor(false);
      toast.success(intl.formatMessage({ id: "calendar.calendarCreated" }));
      onClose();
    } catch {
      toast.error(intl.formatMessage({ id: "calendar.calendarCreateFailed" }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-create-heading"
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="calendar-create-heading"
            className="text-lg font-black text-[var(--color-primary-dark)]"
          >
            {intl.formatMessage({ id: "calendar.createCalendar" })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="space-y-2 block">
            <span className="text-xs font-black uppercase text-slate-400">
              {intl.formatMessage({ id: "calendar.calendarName" })}
            </span>
            <input
              data-modal-initial-focus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={intl.formatMessage({
                id: "calendar.calendarNamePlaceholder",
              })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-slate-400">
              {intl.formatMessage({ id: "calendar.icon" })}
            </span>
            <CalendarIconPicker value={icon} onChange={setIcon} />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-slate-400">
              {intl.formatMessage({ id: "calendar.color" })}
            </span>
            <CalendarColorPicker
              value={color}
              showCustomColor={showCustomColor}
              onChange={setColor}
              onShowCustomColor={setShowCustomColor}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {intl.formatMessage({ id: "calendar.preview" })}
            </p>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-2 py-2 shadow-sm ring-1 ring-slate-100">
              <span
                className="grid h-5 w-5 place-items-center rounded border"
                style={{
                  borderColor: color,
                  backgroundColor: color,
                }}
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
              {icon && (
                <span className="shrink-0 text-sm leading-none">{icon}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
                {previewName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={createCalendar.isPending}
            className="cursor-pointer rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createCalendar.isPending
              ? intl.formatMessage({ id: "app.saving" })
              : intl.formatMessage({ id: "app.create" })}
          </button>
        </div>
      </form>
    </div>
  );
}
