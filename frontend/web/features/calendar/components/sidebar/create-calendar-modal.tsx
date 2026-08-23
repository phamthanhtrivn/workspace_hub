"use client";

import { Check, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useCreateCalendar } from "../../hooks/use-calendar-queries";
import {
  CALENDAR_COLOR_CHOICES,
  CALENDAR_DEFAULT_EVENT_COLOR,
} from "../../types/calendar.constants";

export function CreateCalendarModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const intl = useAppIntl();
  const createCalendar = useCreateCalendar();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CALENDAR_DEFAULT_EVENT_COLOR);
  const [showCustomColor, setShowCustomColor] = useState(false);

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
        color,
        isVisible: true,
      });
      setName("");
      setColor(CALENDAR_DEFAULT_EVENT_COLOR);
      setShowCustomColor(false);
      toast.success(intl.formatMessage({ id: "calendar.calendarCreated" }));
      onClose();
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.calendarCreateFailed" }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-[var(--color-primary-dark)]">
            {intl.formatMessage({ id: "calendar.createCalendar" })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
              {intl.formatMessage({ id: "calendar.color" })}
            </span>
            <div className="grid grid-cols-6 gap-2">
              {CALENDAR_COLOR_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => {
                    setColor(choice);
                    setShowCustomColor(false);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                  style={{ backgroundColor: choice }}
                  aria-label={choice}
                >
                  {color === choice && !showCustomColor && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustomColor(true)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-500 ring-1 ring-slate-200"
                aria-label={intl.formatMessage({
                  id: "calendar.customColor",
                })}
              >
                +
              </button>
            </div>
          </div>

          {showCustomColor && (
            <div className="flex gap-2">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1"
              />
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={createCalendar.isPending}
            className="rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
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
