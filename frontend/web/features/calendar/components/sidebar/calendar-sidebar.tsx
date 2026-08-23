"use client";

import { CalendarPlus, Check, Eye, EyeOff, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useCreateCalendar,
  useUpdateCalendar,
} from "../../hooks/use-calendar-queries";
import { CALENDAR_COLOR_CHOICES } from "../../types/calendar.constants";
import { WorkspaceCalendar } from "../../types/calendar.types";

export function CalendarSidebar({
  calendars,
  selectedCalendarIds,
  onToggleCalendar,
}: {
  calendars: WorkspaceCalendar[];
  selectedCalendarIds: Set<string>;
  onToggleCalendar: (calendarId: string) => void;
}) {
  const intl = useAppIntl();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CALENDAR_COLOR_CHOICES[0]);
  const createCalendar = useCreateCalendar();
  const updateCalendar = useUpdateCalendar();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(intl.formatMessage({ id: "calendar.nameRequired" }));
      return;
    }

    try {
      await createCalendar.mutateAsync({ name: name.trim(), color });
      setName("");
      setColor(CALENDAR_COLOR_CHOICES[0]);
      toast.success(intl.formatMessage({ id: "calendar.calendarCreated" }));
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.calendarCreateFailed" }));
    }
  };

  const toggleVisibility = async (calendar: WorkspaceCalendar) => {
    try {
      await updateCalendar.mutateAsync({
        calendarId: calendar.id,
        payload: { isVisible: !calendar.isVisible },
      });
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.calendarUpdateFailed" }));
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="text-sm font-black text-[var(--color-primary-dark)]">
            {intl.formatMessage({ id: "calendar.myCalendars" })}
          </h2>
        </div>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={intl.formatMessage({
              id: "calendar.calendarNamePlaceholder",
            })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {CALENDAR_COLOR_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setColor(choice)}
                  className="grid h-6 w-6 place-items-center rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                  style={{ backgroundColor: choice }}
                  aria-label={choice}
                >
                  {color === choice && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={createCalendar.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {intl.formatMessage({ id: "app.create" })}
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {calendars.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-xs font-semibold text-slate-400">
            {intl.formatMessage({ id: "calendar.noCalendars" })}
          </div>
        ) : (
          <div className="space-y-1">
            {calendars.map((calendar) => {
              const selected = selectedCalendarIds.has(calendar.id);
              return (
                <div
                  key={calendar.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => onToggleCalendar(calendar.id)}
                    className="grid h-5 w-5 place-items-center rounded border"
                    style={{
                      borderColor: calendar.color,
                      backgroundColor: selected ? calendar.color : "#ffffff",
                    }}
                    aria-label={calendar.name}
                  >
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
                    {calendar.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(calendar)}
                    className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={intl.formatMessage({
                      id: calendar.isVisible
                        ? "calendar.hideCalendar"
                        : "calendar.showCalendar",
                    })}
                  >
                    {calendar.isVisible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
