"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";

export interface DocumentsSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DocumentsSearchInput({
  value,
  onChange,
  placeholder = "Search files & folders...",
  className,
}: DocumentsSearchInputProps) {
  return (
    <div className={cn("relative flex-1 min-w-[200px]", className)}>
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-control border border-input bg-background pl-10 pr-8 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden transition-all"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear document search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export interface DocumentsSelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface DocumentsSelectProps<T extends string = string> {
  value: T;
  options: DocumentsSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function DocumentsSelect<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel = "Select option",
  className,
}: DocumentsSelectProps<T>) {
  return (
    <CustomSelect
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={ariaLabel}
      triggerClassName={cn(
        "h-10 rounded-md border border-input bg-card px-3.5 text-xs font-semibold text-foreground hover:border-input transition-colors cursor-pointer min-w-[110px]",
        className
      )}
    />
  );
}
