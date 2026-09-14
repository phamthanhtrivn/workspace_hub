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
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-2xl border border-slate-200 bg-slate-50/50 pl-10 pr-8 text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[var(--color-primary)] focus:bg-white focus:outline-hidden transition-all"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
        "h-10 rounded-md border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer min-w-[110px]",
        className
      )}
    />
  );
}
