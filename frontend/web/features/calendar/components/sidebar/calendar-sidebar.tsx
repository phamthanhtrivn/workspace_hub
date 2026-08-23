"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { WorkspaceCalendar } from "../../types/calendar.types";
import { CalendarSettingsModal } from "../modal/calendar-settings-modal";
import { CreateCalendarModal } from "../modal/create-calendar-modal";
import { CalendarListItem } from "./calendar-list-item";

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
  const [settingsCalendar, setSettingsCalendar] =
    useState<WorkspaceCalendar | null>(null);

  return (
    <>
      <aside className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[var(--color-primary)]"
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
                  <CalendarListItem
                    key={calendar.id}
                    calendar={calendar}
                    selected={selected}
                    onToggle={() => onToggleCalendar(calendar.id)}
                    onOpenSettings={() => setSettingsCalendar(calendar)}
                  />
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
      <CalendarSettingsModal
        calendar={settingsCalendar}
        open={Boolean(settingsCalendar)}
        onClose={() => setSettingsCalendar(null)}
      />
    </>
  );
}
