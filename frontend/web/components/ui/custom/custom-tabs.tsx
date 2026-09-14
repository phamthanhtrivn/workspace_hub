"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface CustomTabOption<TValue extends string = string> {
  value: TValue;
  label: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface CustomTabsProps<TValue extends string = string> {
  value: TValue;
  options: CustomTabOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel: string;
  className?: string;
}

export function CustomTabs<TValue extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: CustomTabsProps<TValue>) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as TValue)}
      className={className}
    >
      <TabsList
        aria-label={ariaLabel}
        className="h-10 gap-1 rounded-none bg-transparent p-0"
      >
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              "relative h-10 cursor-pointer rounded-none border-b-2 border-transparent bg-transparent px-2.5 text-sm font-black text-slate-500 shadow-none data-[state=active]:border-[var(--color-primary)] data-[state=active]:bg-transparent data-[state=active]:text-[var(--color-primary)] data-[state=active]:shadow-none",
            )}
          >
            {option.label}
            {typeof option.count === "number" && option.count > 0 ? (
              <Badge
                className="h-5 min-w-5 rounded-full border-2 border-white bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm"
              >
                {option.count > 99 ? "99+" : option.count}
              </Badge>
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
