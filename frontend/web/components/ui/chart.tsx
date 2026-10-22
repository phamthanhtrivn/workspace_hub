"use client";

// Adapted from shadcn/ui's MIT-licensed chart components for WorkspaceHub tokens.
// https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/new-york-v4/ui/chart.tsx
import * as React from "react";
import {
  Legend,
  ResponsiveContainer,
  Tooltip,
  type LegendPayload,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { cn } from "@/lib/utils";

// Semantic CSS colors already resolve both account themes; no chart-specific theme.
export type ChartConfig = Record<string, {
  label?: React.ReactNode;
  icon?: React.ComponentType;
  color?: string;
}>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
  const config = React.useContext(ChartContext);
  if (!config) throw new Error("Chart components must be used within ChartContainer.");
  return config;
}

function ChartContainer({ config, className, children, style, ...props }: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>["children"];
}) {
  const chartId = React.useId();
  const colors = Object.fromEntries(
    Object.entries(config).filter(([, series]) => series.color).map(([key, series]) => [`--color-${key}`, series.color]),
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "min-w-0 text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/60 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring",
          className,
        )}
        style={{ ...colors, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 240 }}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = Tooltip;

type ChartTooltipContentProps = React.ComponentProps<"div"> &
  Partial<Pick<TooltipContentProps<TooltipValueType, string | number>, "active" | "payload" | "label" | "labelFormatter" | "formatter">> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "dot" | "line" | "dashed";
    nameKey?: string;
    labelKey?: string;
  };

function ChartTooltipContent({
  active, payload, label, className, hideLabel = false, hideIndicator = false,
  indicator = "dot", nameKey, labelKey, labelFormatter, formatter,
}: ChartTooltipContentProps) {
  const config = useChart();
  if (!active || !payload?.length) return null;

  const first = payload[0];
  const labelConfig = getPayloadConfig(config, first, String(labelKey ?? first.dataKey ?? first.name ?? "value"));
  const heading = labelFormatter
    ? labelFormatter(label, payload)
    : labelKey ? labelConfig?.label : typeof label === "string" ? config[label]?.label ?? label : label;

  return (
    <div className={cn("grid min-w-36 max-w-[min(20rem,80vw)] gap-2 rounded-control border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground [overflow-wrap:anywhere]", className)}>
      {!hideLabel && heading != null ? <div className="font-medium">{heading}</div> : null}
      <div className="grid gap-2">
        {payload.filter((entry) => entry.type !== "none").map((entry, index) => {
          const key = String(nameKey ?? entry.dataKey ?? entry.name ?? "value");
          const series = getPayloadConfig(config, entry, key);
          const Icon = series?.icon;
          const color = series?.color ?? entry.color;
          return (
            <div key={`${key}-${index}`} className="flex min-w-0 items-center gap-2">
              {formatter && entry.value !== undefined && entry.name !== undefined ? formatter(entry.value, entry.name, entry, index, payload) : (
                <>
                  {Icon ? <Icon /> : !hideIndicator ? indicator === "dashed" ? (
                    <svg aria-hidden width={2} height={12} className="shrink-0"><line x1={1} y1={0} x2={1} y2={12} stroke={color} strokeWidth={2} strokeDasharray="2 2" /></svg>
                  ) : (
                    <span aria-hidden className={cn("shrink-0 rounded-sm", indicator === "dot" ? "size-2" : "h-3 w-0.5")} style={{ backgroundColor: color }} />
                  ) : null}
                  <span className="min-w-0 flex-1">{series?.label ?? entry.name}</span>
                  <span className="pl-3 font-medium tabular-nums">{typeof entry.value === "number" ? entry.value.toLocaleString("en") : String(entry.value ?? "")}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = Legend;

function ChartLegendContent({ payload, className, nameKey }: React.ComponentProps<"div"> & {
  payload?: readonly LegendPayload[];
  nameKey?: string;
}) {
  const config = useChart();
  if (!payload?.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-4 text-xs text-muted-foreground", className)}>
      {payload.filter((entry) => entry.type !== "none").map((entry, index) => {
        const key = String(nameKey ?? entry.dataKey ?? entry.value ?? "value");
        const series = getPayloadConfig(config, entry, key);
        return (
          <span key={`${key}-${index}`} className="flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: series?.color ?? entry.color }} />
            {series?.label ?? entry.value}
          </span>
        );
      })}
    </div>
  );
}

function getPayloadConfig(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return config[key];
  const entry = payload as Record<string, unknown>;
  const nested = typeof entry.payload === "object" && entry.payload !== null
    ? entry.payload as Record<string, unknown> : undefined;
  const configKey = typeof entry[key] === "string" ? entry[key]
    : typeof nested?.[key] === "string" ? nested[key] : key;
  return config[String(configKey)] ?? config[key];
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
