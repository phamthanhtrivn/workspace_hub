"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FocusDay } from "../types/dashboard.types";

export default function DashboardProductivityChart({
  days,
}: {
  days: FocusDay[];
}) {
  const data = days.map((day) => ({
    ...day,
    label: new Intl.DateTimeFormat("en", {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${day.date}T12:00:00Z`)),
    minutes: Math.round(day.minutes),
  }));
  return (
    <div
      className="h-60 min-w-0"
      aria-label="Daily focus time in minutes for the last seven days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              color: "var(--popover-foreground)",
              borderRadius: "var(--radius)",
            }}
            labelStyle={{ color: "var(--popover-foreground)" }}
            itemStyle={{ color: "var(--popover-foreground)" }}
            cursor={{ fill: "var(--accent)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload.date ?? ""}
          />
          <Bar
            dataKey="minutes"
            name="Focus minutes"
            fill="var(--chart-2)"
            radius={[0, 0, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          >
            {data.map((day, index) => (
              <Cell
                key={day.date}
                fill={
                  index === data.length - 1
                    ? "var(--chart-1)"
                    : "var(--chart-2)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
