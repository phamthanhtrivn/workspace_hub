"use client";

import React from "react";
import { SearchInput } from "@/components/ui/search-input";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";


export interface ChatSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ChatSearchInput({
  value,
  onChange,
  placeholder = "Search messages, members...",
  className,
}: ChatSearchInputProps) {
  return (
    <SearchInput
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClear={() => onChange("")}
      placeholder={placeholder}
      aria-label={placeholder}
      containerClassName={cn("relative flex-1 min-w-[180px]", className)}
      className="h-9 rounded-control border border-input bg-background pl-9 pr-8 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden transition-all"
    />
  );
}

export interface ChatSelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ChatSelectProps<T extends string = string> {
  value: T;
  options: ChatSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function ChatSelect<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel = "Select option",
  className,
}: ChatSelectProps<T>) {
  return (
    <CustomSelect
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={ariaLabel}
      triggerClassName={cn(
        "h-9 rounded-panel border border-input bg-card px-3 text-xs font-semibold text-foreground hover:border-input transition-colors cursor-pointer min-w-[110px]",
        className
      )}
    />
  );
}
