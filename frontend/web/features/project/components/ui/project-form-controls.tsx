"use client";

import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom/custom-select";
import { SearchInput } from "@/components/ui/search-input";
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
    <SearchInput
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClear={() => onChange("")}
      placeholder={placeholder}
      aria-label={ariaLabel || placeholder}
      containerClassName={cn("relative flex-1 min-w-[180px]", className)}
      className="h-9 rounded-control border border-input bg-background pl-9 pr-8 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-hidden transition-all"
    />
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
        "h-9 rounded-control border border-input bg-card px-3 text-xs font-semibold text-foreground hover:border-input transition-colors cursor-pointer",
        triggerClassName
      )}
      contentClassName={cn("rounded-control border-border", contentClassName)}
      {...props}
    />
  );
}
