"use client";

import { useEffect, useRef } from "react";
import { Check, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatFocusTime,
  type buildPomodoroReport,
} from "../utils/pomodoro-report";
import { POMODORO_DISPLAY_LOCALE } from "../constants/pomodoro-display";
import { POMODORO_SESSION_COPY as copy } from "../constants/pomodoro-session";
import { POMODORO_REPORT_COPY as reportCopy } from "../constants/pomodoro-report";

interface PomodoroDailyStatsProps {
  days: ReturnType<typeof buildPomodoroReport>["daily"];
  visibleDayCount: number;
  totalDays: number;
  hideEmptyDays: boolean;
  onHideEmptyDaysChange: (hide: boolean) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PomodoroDailyStats({
  days,
  visibleDayCount,
  totalDays,
  hideEmptyDays,
  onHideEmptyDaysChange,
  page,
  totalPages,
  onPageChange,
}: PomodoroDailyStatsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayRangeKey = days.map((day) => day.date).join(",");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page, hideEmptyDays, dayRangeKey]);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {reportCopy.dayCount(visibleDayCount, totalDays)}
        </span>
        <Button
          type="button"
          size="sm"
          variant={hideEmptyDays ? "secondary" : "outline"}
          aria-pressed={hideEmptyDays}
          onClick={() => onHideEmptyDaysChange(!hideEmptyDays)}
          className="h-9 gap-2 text-xs"
        >
          <Filter aria-hidden="true" className="size-3.5" />
          {reportCopy.hideEmpty}
          {hideEmptyDays && <Check aria-hidden="true" className="size-3.5" />}
        </Button>
      </div>
      {days.length === 0 ? (
        <div
          role="status"
          className="rounded-control bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground"
        >
          <p>{reportCopy.noActiveDays}</p>
          {hideEmptyDays && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => onHideEmptyDaysChange(false)}
            >
              {reportCopy.showAllDays}
            </Button>
          )}
        </div>
      ) : (
        <Table
          containerRef={scrollRef}
          containerProps={{
            tabIndex: 0,
            role: "region",
            "aria-label": copy.dailyStatsRegion,
          }}
          containerClassName="max-h-[min(28rem,60dvh)] overflow-auto rounded-control border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          className="table-fixed caption-top text-left text-xs tabular-nums"
        >
          <TableCaption className="sr-only">
            {reportCopy.tableCaption}
          </TableCaption>
          <TableHeader className="sticky top-0 z-10 bg-muted text-muted-foreground">
            <TableRow className="hover:bg-transparent">
              <TableHead
                scope="col"
                className="h-11 w-[28%] px-3 text-xs font-medium text-muted-foreground sm:px-4"
              >
                {reportCopy.date}
              </TableHead>
              <TableHead
                scope="col"
                className="h-11 w-[22%] whitespace-normal px-3 text-right text-xs font-medium leading-snug text-muted-foreground sm:px-4"
              >
                {reportCopy.focus}
              </TableHead>
              <TableHead
                scope="col"
                className="h-11 w-[15%] whitespace-normal px-3 text-right text-xs font-medium leading-snug text-muted-foreground sm:px-4"
              >
                {reportCopy.completedColumn}
              </TableHead>
              <TableHead
                scope="col"
                className="h-11 w-[15%] whitespace-normal px-3 text-right text-xs font-medium leading-snug text-muted-foreground sm:px-4"
              >
                Stopped
              </TableHead>
              <TableHead
                scope="col"
                className="h-11 w-[20%] whitespace-normal px-3 text-right text-xs font-medium leading-snug text-muted-foreground sm:px-4"
              >
                Completion
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => {
              const date = new Date(`${day.date}T00:00:00`);
              const totalFocus =
                day.completedFocusSessions + day.stoppedFocusSessions;
              const rate =
                totalFocus > 0
                  ? Math.round((day.completedFocusSessions / totalFocus) * 100)
                  : 0;

              return (
                <TableRow
                  key={day.date}
                  className="border-border hover:bg-muted/40"
                >
                  <TableHead
                    scope="row"
                    className="h-14 whitespace-normal px-3 py-2.5 text-xs font-normal sm:px-4"
                  >
                    <time
                      dateTime={day.date}
                      className="block font-medium text-foreground"
                    >
                      {date.toLocaleDateString(POMODORO_DISPLAY_LOCALE, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {date.toLocaleDateString(POMODORO_DISPLAY_LOCALE, {
                        weekday: "long",
                      })}
                    </span>
                  </TableHead>
                  <TableCell
                    className={cn(
                      "whitespace-normal break-words px-3 py-2.5 text-right text-sm sm:px-4",
                      day.focusSeconds > 0
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatFocusTime(day.focusSeconds)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right sm:px-4">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-control px-2 py-1 text-xs font-medium",
                        day.completedFocusSessions > 0
                          ? "bg-success-soft text-success-content"
                          : "text-muted-foreground",
                      )}
                    >
                      {day.completedFocusSessions > 0 && (
                        <CheckCircle2
                          aria-hidden="true"
                          className="hidden size-3.5 @min-[480px]/pomodoro:block"
                        />
                      )}
                      {day.completedFocusSessions}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-3 py-2.5 text-right text-xs font-medium sm:px-4",
                      day.stoppedFocusSessions > 0
                        ? "text-warning-content"
                        : "text-muted-foreground",
                    )}
                  >
                    {day.stoppedFocusSessions}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right sm:px-4">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="font-semibold text-foreground">
                        {rate}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {totalPages > 1 && (
        <SimplePagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          ariaLabel={reportCopy.pagination}
          className="mt-3 @max-[400px]/pomodoro:[&>button:first-child]:hidden @max-[400px]/pomodoro:[&>button:last-child]:hidden"
        />
      )}
    </div>
  );
}
