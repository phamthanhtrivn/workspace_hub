"use client";

import { CalendarPlus, Check, Eye, EyeOff, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useUpdateCalendar } from "../../hooks/use-calendar-queries";
import { WorkspaceCalendar } from "../../types/calendar.types";
import { CreateCalendarModal } from "./create-calendar-modal";

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const updateCalendar = useUpdateCalendar();

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
    <>
      <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[var(--color-primary)]"
          >
            <Plus className="h-4 w-4" />
            {intl.formatMessage({ id: "calendar.createCalendar" })}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="mb-2 flex items-center gap-2 px-2">
            <CalendarPlus className="h-4 w-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-black text-[var(--color-primary-dark)]">
              {intl.formatMessage({ id: "calendar.myCalendars" })}
            </h2>
          </div>
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
                    {calendar.isDefault && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                        {intl.formatMessage({ id: "calendar.default" })}
                      </span>
                    )}
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

      <CreateCalendarModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}
