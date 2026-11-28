"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-10 w-fit items-center justify-center gap-1 rounded-none bg-transparent p-0 text-muted-foreground",
          listClassName,
        )}
      >
        {options.map((option) => (
          <Button
            type="button"
            variant="unstyled"
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-pressed={value === option.value}
            data-state={value === option.value ? "active" : "inactive"}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-2.5 text-sm font-semibold text-muted-foreground shadow-none data-[state=active]:border-link data-[state=active]:bg-transparent data-[state=active]:text-link data-[state=active]:shadow-none",
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
          </Button>
        ))}
      </div>
    </div>
  );
}
