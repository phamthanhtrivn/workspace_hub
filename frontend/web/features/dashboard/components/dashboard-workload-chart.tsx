"use client";

import { Bar, BarChart, BarStack, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { WORKLOAD_CHART_CONFIG } from "../constants/dashboard-chart-config";
import type { ProjectWorkload } from "../types/dashboard-analytics.types";

export default function DashboardWorkloadChart({ projects }: { projects: ProjectWorkload[] }) {
  const names = new Map(projects.map((project) => [project.projectId, project.projectName]));
  return (
    <ChartContainer config={WORKLOAD_CHART_CONFIG} className="h-64 w-full" role="group" aria-label="Top five projects by open tasks assigned to you">
      <BarChart data={projects} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 0 }} accessibilityLayer>
        <CartesianGrid horizontal={false} strokeDasharray="3 4" />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tickMargin={8} />
        <YAxis type="category" dataKey="projectId" width={120} axisLine={false} tickLine={false} tickMargin={12} tickFormatter={(id: string) => {
          const name = names.get(id) ?? id;
          return name.length > 17 ? `${name.slice(0, 16)}…` : name;
        }} />
        <ChartLegend verticalAlign="top" align="left" content={<ChartLegendContent className="justify-start pb-4 pt-0" />} />
        <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent labelFormatter={(id) => names.get(String(id)) ?? id} />} />
        <BarStack radius={4}>
          <Bar dataKey="overdue" fill="var(--color-overdue)" maxBarSize={20} isAnimationActive={false} />
          <Bar dataKey="remaining" fill="var(--color-remaining)" maxBarSize={20} isAnimationActive={false}>
            <LabelList dataKey="total" position="right" offset={8} className="fill-foreground text-xs font-medium tabular-nums" />
          </Bar>
        </BarStack>
      </BarChart>
    </ChartContainer>
  );
}
