"use client";

import { DatesSetArg, DayHeaderContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { getMiniCalendarWeekdayLabel, isSameDate } from "../../utils/calendar-date.utils";

export function MiniCalendar({
  currentDate,
  selectedDate,
  onSelectDate,
}: {
  currentDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}) {
  const intl = useAppIntl();
  const miniCalendarRef = useRef<FullCalendar | null>(null);
  const [visibleDate, setVisibleDate] = useState(currentDate);

  const title = useMemo(
    () =>
      new Intl.DateTimeFormat(intl.locale, {
        month: "long",
        year: "numeric",
      }).format(visibleDate),
    [intl.locale, visibleDate],
  );

  useEffect(() => {
    const api = miniCalendarRef.current?.getApi();
    if (!api || isSameDate(api.getDate(), currentDate)) return;

    api.gotoDate(currentDate);
    setVisibleDate(currentDate);
  }, [currentDate]);

  const move = (direction: "prev" | "next") => {
    const api = miniCalendarRef.current?.getApi();
    if (!api) return;

    if (direction === "prev") api.prev();
    if (direction === "next") api.next();
    setVisibleDate(api.getDate());
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    setVisibleDate(arg.view.currentStart);
  };

  const handleDateClick = (arg: DateClickArg) => {
    onSelectDate(arg.date);
  };

  const renderDayHeader = (arg: DayHeaderContentArg) => (
    <span>{getMiniCalendarWeekdayLabel(arg.date, intl.locale)}</span>
  );

  return (
    <div className="calendar-mini-shell px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="truncate text-sm font-black capitalize text-[var(--color-primary-dark)]">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move("prev")}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={intl.formatMessage({ id: "app.previous" })}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => move("next")}
            className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={intl.formatMessage({ id: "app.next" })}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <FullCalendar
        ref={miniCalendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={currentDate}
        locale={intl.locale}
        firstDay={1}
        headerToolbar={false}
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates
        dayHeaderContent={renderDayHeader}
        events={[]}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        dayCellClassNames={(arg) =>
          isSameDate(arg.date, selectedDate) ? ["is-selected-date"] : []
        }
      />
    </div>
  );
}
