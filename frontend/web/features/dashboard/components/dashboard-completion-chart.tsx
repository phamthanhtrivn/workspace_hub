"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { COMPLETION_CHART_CONFIG } from "../constants/dashboard-chart-config";
import type { TaskCompletionDay } from "../types/dashboard-analytics.types";

export default function DashboardCompletionChart({ days }: { days: TaskCompletionDay[] }) {
  return (
    <ChartContainer config={COMPLETION_CHART_CONFIG} className="h-60 w-full" role="group" aria-label={`Daily completed tasks over the last ${days.length} days`}>
      <LineChart data={days} margin={{ top: 16, right: 16, left: -20, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 4" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={32} tickFormatter={(date: string) => days.find((day) => day.date === date)?.label ?? date} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tickMargin={8} domain={[0, (maximum: number) => Math.max(1, maximum)]} />
        <ChartTooltip cursor={{ stroke: "var(--border)", strokeDasharray: "3 4" }} isAnimationActive={false} content={<ChartTooltipContent indicator="line" />} />
        <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" dot={days.length <= 7 ? { r: 3, fill: "var(--card)", strokeWidth: 2 } : false} activeDot={{ r: 5, fill: "var(--color-count)", stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}
