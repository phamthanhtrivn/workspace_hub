"use client";

import {
  CalendarDays,
  ChevronDown,
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
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-3 py-2 sm:px-5">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label={intl.formatMessage({ id: "calendar.myCalendars" })}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate("today")}
          className="hidden cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] sm:block"
        >
          {intl.formatMessage({ id: "calendar.today" })}
        </button>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onNavigate("prev")}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95"
            aria-label={intl.formatMessage({ id: "app.previous" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("next")}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95"
            aria-label={intl.formatMessage({ id: "app.next" })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="truncate px-2 text-base font-bold capitalize tracking-tight text-slate-800 sm:text-lg">
          {title || intl.formatMessage({ id: "nav.calendar" })}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CalendarDays className="hidden h-4 w-4 text-slate-400 sm:block" />
        <div className="relative">
          <select
            value={activeView}
            onChange={(event) => onViewChange(event.target.value)}
            className="h-9 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-bold text-slate-700 shadow-xs outline-none transition hover:border-slate-300 hover:bg-slate-50 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-100"
            aria-label={intl.formatMessage({ id: "nav.calendar" })}
          >
            {CALENDAR_VIEW_OPTIONS.map((view) => (
              <option key={view.value} value={view.value}>
                {intl.formatMessage({ id: view.labelId })}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
