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
  listClassName?: string;
  triggerClassName?: string;
}

export function CustomTabs<TValue extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  listClassName,
  triggerClassName,
}: CustomTabsProps<TValue>) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as TValue)}
      className={className}
    >
      <TabsList
        aria-label={ariaLabel}
        className={cn(
          "h-10 gap-1 rounded-none bg-transparent p-0",
          listClassName,
        )}
      >
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={cn(
              "relative h-10 cursor-pointer rounded-none border-b-2 border-transparent bg-transparent px-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none",
              triggerClassName,
            )}
          >
            {option.label}
            {typeof option.count === "number" && option.count > 0 ? (
              <Badge
                className="h-5 min-w-5 rounded-full border-2 border-border bg-destructive px-1.5 text-xs font-semibold leading-none text-destructive-foreground"
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
