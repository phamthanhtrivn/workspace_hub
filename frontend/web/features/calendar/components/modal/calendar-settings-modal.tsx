"use client";

import { Eye, EyeOff, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useDeleteCalendar,
  useUpdateCalendar,
} from "../../hooks/use-calendar-queries";
import { CALENDAR_DEFAULT_EVENT_COLOR } from "../../types/calendar.constants";
import { WorkspaceCalendar } from "../../types/calendar.types";
import {
  CalendarColorPicker,
  CalendarIconPicker,
} from "../sidebar/calendar-style-fields";

export function CalendarSettingsModal({
  calendar,
  open,
  onClose,
}: {
  calendar: WorkspaceCalendar | null;
  open: boolean;
  onClose: () => void;
}) {
  const intl = useAppIntl();
  const updateCalendar = useUpdateCalendar();
  const deleteCalendar = useDeleteCalendar();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [color, setColor] = useState(CALENDAR_DEFAULT_EVENT_COLOR);
  const [isVisible, setIsVisible] = useState(true);
  const [showCustomColor, setShowCustomColor] = useState(false);

  useEffect(() => {
    if (!calendar || !open) return;
    setName(calendar.name);
    setIcon(calendar.icon || null);
    setColor(calendar.color || CALENDAR_DEFAULT_EVENT_COLOR);
    setIsVisible(calendar.isVisible);
    setShowCustomColor(false);
  }, [calendar, open]);

  if (!open || !calendar) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error(intl.formatMessage({ id: "calendar.nameRequired" }));
      return;
    }

    try {
      await updateCalendar.mutateAsync({
        calendarId: calendar.id,
        payload: {
          name: name.trim(),
          icon: icon || null,
          color,
          isVisible,
        },
      });
      toast.success(intl.formatMessage({ id: "calendar.calendarUpdated" }));
      onClose();
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.calendarUpdateFailed" }));
    }
  };

  const handleDelete = async () => {
    if (calendar.isDefault) return;

    try {
      await deleteCalendar.mutateAsync(calendar.id);
      toast.success(intl.formatMessage({ id: "calendar.calendarDeleted" }));
      onClose();
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.calendarDeleteFailed" }));
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
            {intl.formatMessage({ id: "calendar.settings" })}
          </h2>
          <button
            type="button"
            onClick={onClose}
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
              value={name}
              onChange={(event) => setName(event.target.value)}
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

          <button
            type="button"
            onClick={() => setIsVisible((current) => !current)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            {isVisible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            {intl.formatMessage({
              id: isVisible ? "calendar.hideCalendar" : "calendar.showCalendar",
            })}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <div>
            {!calendar.isDefault && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={calendar.isDefault || deleteCalendar.isPending}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {intl.formatMessage({ id: "app.delete" })}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              {intl.formatMessage({ id: "app.cancel" })}
            </button>
            <button
              type="submit"
              disabled={updateCalendar.isPending}
              className="cursor-pointer rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateCalendar.isPending
                ? intl.formatMessage({ id: "app.saving" })
                : intl.formatMessage({ id: "app.save" })}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
