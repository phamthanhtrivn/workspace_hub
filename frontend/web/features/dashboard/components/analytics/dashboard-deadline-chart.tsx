"use client";

import { Label, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DEADLINE_CHART_CONFIG } from "../../constants/dashboard-chart-config";
import type { TaskDeadlineSlice } from "../../types/dashboard-analytics.types";

export default function DashboardDeadlineChart({ slices }: { slices: TaskDeadlineSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  const segments = slices.map((slice, index) => ({
    ...slice,
    category: `deadline${index}`,
    fill: `var(--color-deadline${index})`,
  })).filter((slice) => slice.count > 0);
  return (
    <ChartContainer config={DEADLINE_CHART_CONFIG} className="mx-auto h-64 w-full max-w-96 @min-[640px]/dashboard:h-80" role="group" aria-label={`Open tasks grouped by deadline: ${total} tasks`}>
      <PieChart accessibilityLayer>
        <ChartTooltip cursor={false} isAnimationActive={false} content={<ChartTooltipContent nameKey="category" hideLabel />} />
        <Pie data={segments} dataKey="count" nameKey="category" innerRadius="72%" outerRadius="92%" cornerRadius={4} paddingAngle={segments.length > 1 ? 3 : 0} strokeWidth={0} isAnimationActive={false}>
          <Label content={({ viewBox }) => {
            if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
            return (
              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                <tspan x={viewBox.cx} dy="-0.2em" className="fill-foreground text-3xl font-semibold tabular-nums @min-[640px]/dashboard:text-4xl">{total.toLocaleString("en")}</tspan>
                <tspan x={viewBox.cx} dy="1.9em" className="fill-muted-foreground text-xs">Open tasks</tspan>
              </text>
            );
          }} />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
