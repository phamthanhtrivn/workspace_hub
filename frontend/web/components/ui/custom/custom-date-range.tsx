"use client";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";


import * as React from "react";

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
            <CustomDatePicker
              value={fromDate}
              max={toDate || undefined}
              onChange={nextValue => onFromDateChange(nextValue)}
              ariaLabel={fromLabel}
              triggerClassName="h-8 min-w-0 cursor-pointer rounded-control border-input px-2 text-xs font-semibold"
              allowClear
            />
          </label>
          <span className="text-xs font-semibold text-muted-foreground">{toText}</span>
          <label className="min-w-0">
            <span className="sr-only">{toLabel}</span>
            <CustomDatePicker
              value={toDate}
              min={fromDate || undefined}
              onChange={nextValue => onToDateChange(nextValue)}
              ariaLabel={toLabel}
              triggerClassName="h-8 min-w-0 cursor-pointer rounded-control border-input px-2 text-xs font-semibold"
              allowClear
            />
          </label>
        </div>
      ) : null}

      {invalid && invalidMessage ? (
        <p className="text-xs font-semibold text-destructive-content">{invalidMessage}</p>
      ) : null}
    </div>
  );
}
