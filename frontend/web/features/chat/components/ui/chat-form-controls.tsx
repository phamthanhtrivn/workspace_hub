"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
    <div className={cn("relative flex-1 min-w-[180px]", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-hidden transition-all"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
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
        "h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer min-w-[110px]",
        className
      )}
    />
  );
}
