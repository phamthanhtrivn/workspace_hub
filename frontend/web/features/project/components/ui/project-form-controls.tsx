"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";

export interface ProjectSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function ProjectSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  ariaLabel,
  className,
}: ProjectSearchInputProps) {
  return (
    <div className={cn("relative flex-1 min-w-[180px]", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        role="searchbox"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-8 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#0052CC] focus:bg-white focus:outline-hidden transition-all"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-transparent cursor-pointer p-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export interface ProjectSelectProps<TValue extends string = string> {
  value: TValue;
  options: CustomSelectOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function ProjectSelect<TValue extends string = string>({
  triggerClassName,
  contentClassName,
  ariaLabel,
  placeholder,
  ...props
}: ProjectSelectProps<TValue>) {
  return (
    <CustomSelect
      ariaLabel={ariaLabel || placeholder || "Select option"}
      placeholder={placeholder}
      triggerClassName={cn(
        "h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer",
        triggerClassName
      )}
      contentClassName={cn("rounded-xl border-slate-200 shadow-lg", contentClassName)}
      {...props}
    />
  );
}
