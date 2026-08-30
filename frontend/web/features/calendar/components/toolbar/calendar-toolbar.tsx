"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CALENDAR_VIEW_OPTIONS } from "../../types/calendar.constants";

export function CalendarToolbar({
  title,
  activeView,
  onViewChange,
  onNavigate,
  onToggleSidebar,
}: {
  title: string;
  activeView: string;
  onViewChange: (view: string) => void;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onToggleSidebar: () => void;
}) {
  const intl = useAppIntl();

  return (
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label={intl.formatMessage({ id: "calendar.myCalendars" })}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNavigate("prev")}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={intl.formatMessage({ id: "app.previous" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("next")}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={intl.formatMessage({ id: "app.next" })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("today")}
          className="hidden cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:block"
        >
          {intl.formatMessage({ id: "calendar.today" })}
        </button>
        <h2 className="truncate px-1 text-base font-semibold capitalize text-slate-800 sm:text-xl">
          {title || intl.formatMessage({ id: "nav.calendar" })}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CalendarDays className="hidden h-4 w-4 text-slate-400 sm:block" />
        <select
          value={activeView}
          onChange={(event) => onViewChange(event.target.value)}
          className="h-10 cursor-pointer rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 outline-none transition hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:px-3"
          aria-label={intl.formatMessage({ id: "nav.calendar" })}
        >
          {CALENDAR_VIEW_OPTIONS.map((view) => (
            <option key={view.value} value={view.value}>
              {intl.formatMessage({ id: view.labelId })}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
