"use client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import { useEffect, useRef } from "react";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatFocusTime, type buildPomodoroReport } from "../utils/pomodoro-report";

interface PomodoroDailyStatsProps {
  days: ReturnType<typeof buildPomodoroReport>["daily"];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PomodoroDailyStats({ days, page, totalPages, onPageChange }: PomodoroDailyStatsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [page]);

  return (
    <Collapsible className="mt-4" defaultOpen>
      <CollapsibleTrigger render={<Button type="button" variant="ghost" className="group h-auto w-full justify-between whitespace-normal text-left" />} className="cursor-pointer text-xs font-semibold text-foreground">Daily stats</CollapsibleTrigger><CollapsibleContent>
      <Table containerRef={scrollRef} containerClassName="mt-2 max-h-56 overflow-auto" className="caption-top text-left text-xs">
        <TableCaption className="sr-only">Focus time and completed sessions by day</TableCaption>
        <TableHeader className="sticky top-0 bg-card text-muted-foreground [&_tr]:border-0">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="h-auto px-0 py-2 font-semibold text-muted-foreground">Date</TableHead>
            <TableHead scope="col" className="h-auto p-0 font-semibold text-muted-foreground">Focus</TableHead>
            <TableHead scope="col" className="h-auto p-0 text-right font-semibold text-muted-foreground">Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-t">
          {days.map((day) => (
            <TableRow key={day.date} className="border-t border-b-0 border-border text-muted-foreground hover:bg-transparent">
              <TableHead scope="row" className="h-auto px-0 py-2 font-normal text-muted-foreground">{day.date.split("-").reverse().join("/")}</TableHead>
              <TableCell className="p-0">{formatFocusTime(day.focusSeconds)}</TableCell>
              <TableCell className="p-0 text-right">{day.completedFocusSessions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={onPageChange} ariaLabel="Daily stats pagination" className="mt-2" />
      )}
    </CollapsibleContent>
    </Collapsible>
  );
}
