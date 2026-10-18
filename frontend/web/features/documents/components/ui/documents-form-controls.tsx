"use client";

import React from "react";
import { SearchInput } from "@/components/ui/search-input";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";


export interface DocumentsSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

export function DocumentsSearchInput({
  value,
  onChange,
  placeholder = "Search files & folders...",
  className,
  inputRef,
}: DocumentsSearchInputProps) {
  return (
    <SearchInput ref={inputRef} aria-keyshortcuts="Control+k Meta+k"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClear={() => onChange("")}
      placeholder={placeholder}
      aria-label={placeholder}
      containerClassName={cn("relative flex-1 min-w-[200px]", className)}
      iconClassName="left-3.5"
      clearLabel="Clear document search"
      className="h-10 rounded-control border border-input bg-background pl-10 pr-8 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden transition-all"
    />
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
