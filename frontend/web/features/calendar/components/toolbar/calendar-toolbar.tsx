"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          aria-label={intl.formatMessage({ id: "calendar.myCalendars" })}
          title={intl.formatMessage({ id: "calendar.myCalendars" })}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onNavigate("today")}
          className="hidden cursor-pointer rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] sm:block"
        >
          {intl.formatMessage({ id: "calendar.today" })}
        </Button>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onNavigate("prev")}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95"
            aria-label={intl.formatMessage({ id: "app.previous" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onNavigate("next")}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95"
            aria-label={intl.formatMessage({ id: "app.next" })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="truncate px-2 text-base font-bold capitalize tracking-tight text-slate-800 sm:text-lg">
          {title || intl.formatMessage({ id: "nav.calendar" })}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CalendarDays className="hidden h-4 w-4 text-slate-400 sm:block" />
        <CustomSelect
          value={activeView}
          onChange={onViewChange}
          ariaLabel={intl.formatMessage({ id: "nav.calendar" })}
          options={CALENDAR_VIEW_OPTIONS.map((view) => ({
            value: view.value,
            label: intl.formatMessage({ id: view.labelId }),
          }))}
          triggerClassName="h-9 cursor-pointer rounded-lg border-slate-200 bg-white pl-3 pr-8 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-blue-100"
          contentClassName="rounded-lg border-slate-200"
        />
      </div>
    </div>
  );
}
