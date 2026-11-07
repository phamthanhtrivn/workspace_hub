"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import { POMODORO_DISPLAY_LOCALE } from "../constants/pomodoro-display";
import { formatFocusTime, type buildPomodoroReport } from "../utils/pomodoro-report";

const CHART_CONFIG = { focusSeconds: { label: copy.focusTime, color: "var(--link)" } };
type ReportDays = ReturnType<typeof buildPomodoroReport>["daily"];

function formatChartDate(date: string, full = false) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(POMODORO_DISPLAY_LOCALE, {
    day: "numeric", month: "short", ...(full ? { year: "numeric" } : {}),
  });
}

export function PomodoroReportChart({ days }: { days: ReportDays }) {
  const id = useId();
  const hasFocusTime = days.some(day => day.focusSeconds > 0);

  return <section aria-labelledby={`${id}-title`} className="py-5">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 id={`${id}-title`} className="text-sm font-semibold text-foreground">{copy.focusActivity}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.activityHint}</p>
      </div>
      <span className="flex items-center gap-2 text-xs text-muted-foreground"><span aria-hidden="true" className="size-2 rounded-sm bg-link" />{copy.focusMinutes}</span>
    </div>
    {hasFocusTime ? <ChartContainer config={CHART_CONFIG} className="h-52 w-full @min-[640px]/pomodoro:h-60" role="group" aria-label={copy.activityRegion}>
      <BarChart data={days} accessibilityLayer margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={28} tickFormatter={date => formatChartDate(String(date))} />
        <YAxis axisLine={false} tickLine={false} tickMargin={8} width={52} domain={[0, "auto"]} tickFormatter={(seconds: number) => `${Number((seconds / 60).toFixed(1))}`} />
        <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent
          labelFormatter={date => formatChartDate(String(date), true)}
          formatter={(value, _name, entry) => {
            const day = days.find(day => day.date === (entry.payload as ReportDays[number]).date);
            return <div className="grid w-full gap-2">
              <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{copy.focusTime}</span><span className="font-medium tabular-nums">{formatFocusTime(Number(value))}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">{copy.completed}</span><span className="font-medium tabular-nums">{day?.completedFocusSessions ?? 0}</span></div>
            </div>;
          }} />} />
        <Bar dataKey="focusSeconds" fill="var(--color-focusSeconds)" radius={[3, 3, 0, 0]} maxBarSize={40} isAnimationActive={false} />
      </BarChart>
    </ChartContainer> : <div role="status" className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-control bg-muted/40 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{copy.noFocusActivity}</p>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{copy.noFocusHint}</p>
    </div>}
  </section>;
}
