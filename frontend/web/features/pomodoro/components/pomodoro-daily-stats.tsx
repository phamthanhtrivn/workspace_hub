"use client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import { useEffect, useRef } from "react";
import { Check, ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFocusTime, type buildPomodoroReport } from "../utils/pomodoro-report";
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

export function PomodoroDailyStats({ days, visibleDayCount, totalDays, hideEmptyDays, onHideEmptyDaysChange, page, totalPages, onPageChange }: PomodoroDailyStatsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayRangeKey = days.map(day => day.date).join(",");

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page, hideEmptyDays, dayRangeKey]);

  return (
    <Collapsible className="mt-4" defaultOpen>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <CollapsibleTrigger render={<Button type="button" variant="ghost" className="group h-9 gap-2 px-0 text-sm font-semibold hover:bg-transparent" />}>
            {reportCopy.dailyStats}<ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
          </CollapsibleTrigger>
          <span className="text-xs text-muted-foreground">{reportCopy.dayCount(visibleDayCount, totalDays)}</span>
        </div>
        <Button type="button" size="sm" variant={hideEmptyDays ? "secondary" : "outline"} aria-pressed={hideEmptyDays}
          onClick={() => onHideEmptyDaysChange(!hideEmptyDays)} className="gap-2 text-xs">
          <Filter aria-hidden="true" className="size-3.5" />{reportCopy.hideEmpty}{hideEmptyDays && <Check aria-hidden="true" className="size-3.5" />}
        </Button>
      </div>
      <CollapsibleContent>
      {days.length === 0 ? <div role="status" className="rounded-control bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
        <p>{reportCopy.noActiveDays}</p>
        <Button type="button" variant="link" size="sm" className="mt-2" onClick={() => onHideEmptyDaysChange(false)}>{reportCopy.showAllDays}</Button>
      </div> :
      <Table containerRef={scrollRef} containerProps={{ tabIndex: 0, role: "region", "aria-label": copy.dailyStatsRegion }}
        containerClassName="max-h-80 overflow-auto rounded-control border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        className="table-fixed caption-top text-left text-xs tabular-nums">
        <TableCaption className="sr-only">{reportCopy.tableCaption}</TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-muted text-muted-foreground">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="h-10 w-2/5 px-2.5 text-xs font-medium text-muted-foreground">{reportCopy.date}</TableHead>
            <TableHead scope="col" className="h-10 w-[30%] whitespace-normal px-2.5 text-right text-xs font-medium leading-snug text-muted-foreground">{reportCopy.focus}</TableHead>
            <TableHead scope="col" className="h-10 w-[30%] whitespace-normal px-2.5 text-right text-xs font-medium leading-snug text-muted-foreground">{reportCopy.completedColumn}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.map((day) => (
            <TableRow key={day.date} className="border-border hover:bg-muted/40">
              <TableHead scope="row" className="h-10 px-2.5 py-2 text-xs font-normal text-foreground">{day.date.split("-").reverse().join("/")}</TableHead>
              <TableCell className={cn("whitespace-normal break-words px-2.5 py-2 text-right", day.focusSeconds > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>{formatFocusTime(day.focusSeconds)}</TableCell>
              <TableCell className={cn("px-2.5 py-2 text-right", day.completedFocusSessions > 0 ? "font-semibold text-success-content" : "text-muted-foreground")}>{day.completedFocusSessions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>}
      {totalPages > 1 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={onPageChange} ariaLabel={reportCopy.pagination} className="mt-3" />
      )}
    </CollapsibleContent>
    </Collapsible>
  );
}
