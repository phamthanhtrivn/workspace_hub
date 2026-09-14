"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";

interface CustomDateRangeProps<TValue extends string = string> {
  value: TValue;
  options: CustomSelectOption<TValue>[];
  fromDate: string;
  toDate: string;
  invalid?: boolean;
  customRangeValue: TValue;
  onFilterChange: (value: TValue) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  ariaLabel: string;
  fromLabel: string;
  toLabel: string;
  toText: string;
  invalidMessage?: string;
  className?: string;
}

export function CustomDateRange<TValue extends string = string>({
  value,
  options,
  fromDate,
  toDate,
  invalid,
  customRangeValue,
  onFilterChange,
  onFromDateChange,
  onToDateChange,
  ariaLabel,
  fromLabel,
  toLabel,
  toText,
  invalidMessage,
  className,
}: CustomDateRangeProps<TValue>) {
  const isCustomRange = value === customRangeValue;

  return (
    <div className={cn("space-y-2.5", className)}>
      <CustomSelect
        value={value}
        options={options}
        onChange={onFilterChange}
        ariaLabel={ariaLabel}
        invalid={invalid}
        triggerClassName="pl-3"
      />

      {isCustomRange ? (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <label className="min-w-0">
            <span className="sr-only">{fromLabel}</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => onFromDateChange(event.target.value)}
                aria-label={fromLabel}
                className="h-8 min-w-0 cursor-pointer rounded-lg border-slate-200 pl-8 pr-2 text-xs font-semibold"
              />
            </div>
          </label>
          <span className="text-xs font-black text-slate-400">{toText}</span>
          <label className="min-w-0">
            <span className="sr-only">{toLabel}</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => onToDateChange(event.target.value)}
                aria-label={toLabel}
                className="h-8 min-w-0 cursor-pointer rounded-lg border-slate-200 pl-8 pr-2 text-xs font-semibold"
              />
            </div>
          </label>
        </div>
      ) : null}

      {invalid && invalidMessage ? (
        <p className="text-xs font-semibold text-destructive">{invalidMessage}</p>
      ) : null}
    </div>
  );
}
