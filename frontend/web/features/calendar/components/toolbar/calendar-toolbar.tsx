"use client";

import { CalendarApi } from "@fullcalendar/core";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  Plus,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CALENDAR_VIEW_OPTIONS } from "../../types/calendar.constants";

export function CalendarToolbar({
  calendarApi,
  title,
  activeView,
  onViewChange,
  onCreateEvent,
}: {
  calendarApi: CalendarApi | null;
  title: string;
  activeView: string;
  onViewChange: (view: string) => void;
  onCreateEvent: () => void;
}) {
  const intl = useAppIntl();

  const move = (direction: "prev" | "next" | "today") => {
    if (!calendarApi) return;
    if (direction === "prev") calendarApi.prev();
    if (direction === "next") calendarApi.next();
    if (direction === "today") calendarApi.today();
  };

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onCreateEvent}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-primary-dark)] px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-primary)] active:translate-y-px"
        >
          <Plus className="h-4 w-4" />
          {intl.formatMessage({ id: "calendar.newEvent" })}
        </button>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move("prev")}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={intl.formatMessage({ id: "app.previous" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => move("next")}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={intl.formatMessage({ id: "app.next" })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => move("today")}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {intl.formatMessage({ id: "calendar.today" })}
        </button>
        <h2 className="truncate text-lg font-black capitalize text-[var(--color-primary-dark)]">
          {title || intl.formatMessage({ id: "nav.calendar" })}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <CalendarDays className="hidden h-4 w-4 text-slate-400 sm:block" />
        <div className="grid grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {CALENDAR_VIEW_OPTIONS.map((view) => (
            <button
              key={view.value}
              type="button"
              onClick={() => onViewChange(view.value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeView === view.value
                  ? "bg-white text-[var(--color-primary-dark)] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {view.value === "listWeek" ? (
                <span className="inline-flex items-center gap-1">
                  <List className="h-3.5 w-3.5" />
                  {intl.formatMessage({ id: view.labelId })}
                </span>
              ) : (
                intl.formatMessage({ id: view.labelId })
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
