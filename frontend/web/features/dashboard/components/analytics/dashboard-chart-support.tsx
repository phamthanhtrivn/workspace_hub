"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryFeedback } from "../common/dashboard-panel";
import { DashboardDisclosureContent } from "../common/dashboard-disclosure";

type ChartQuery = Parameters<typeof QueryFeedback>[0]["query"];

export function DashboardChartSkeleton() {
  return (
    <div role="status" aria-label="Loading chart">
      <Skeleton className="h-60 w-full rounded-control motion-reduce:animate-none" />
    </div>
  );
}

export function DashboardChartFeedback({ queries }: {
  queries: readonly { query: ChartQuery; label: string }[];
}) {
  const errors = queries.filter(({ query }) => query.isError);
  if (errors.length) return errors.map(({ query, label }) => <QueryFeedback key={label} query={query} label={label} />);
  return queries.some(({ query }) => query.isPending) ? <DashboardChartSkeleton /> : null;
}

export function DashboardChartData({ caption, columns, rows }: {
  caption: string;
  columns: readonly string[];
  rows: readonly { key: string; cells: readonly ReactNode[] }[];
}) {
  return (
    <DashboardDisclosureContent>
      <Table className="text-xs">
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>{columns.map((column) => <TableHead key={column} scope="col">{column}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              {row.cells.map((cell, index) => <TableCell key={columns[index]} className="whitespace-normal break-words tabular-nums">{cell}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashboardDisclosureContent>
  );
}
