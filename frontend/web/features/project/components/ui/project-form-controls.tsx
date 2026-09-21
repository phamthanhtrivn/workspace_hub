"use client";

import React, { type ComponentProps } from "react";
import { Search, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
        type="search"
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

type ProjectButtonTone =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

const projectButtonToneClass: Record<ProjectButtonTone, string> = {
  primary:
    "bg-[#0052CC] text-white hover:bg-[#0747A6] shadow-sm",
  secondary:
    "bg-slate-100 text-slate-700 hover:bg-slate-200",
  outline:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

interface ProjectButtonProps
  extends Omit<ComponentProps<typeof Button>, "variant"> {
  tone?: ProjectButtonTone;
}

export function ProjectButton({
  tone = "primary",
  className,
  ...props
}: ProjectButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "cursor-pointer font-bold transition duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        projectButtonToneClass[tone],
        className
      )}
      {...props}
    />
  );
}

interface ProjectInputProps extends ComponentProps<typeof Input> {
  icon?: LucideIcon;
  invalid?: boolean;
  containerClassName?: string;
}

export function ProjectInput({
  icon: Icon,
  invalid,
  className,
  containerClassName,
  ...props
}: ProjectInputProps) {
  if (!Icon) {
    return (
      <Input
        aria-invalid={invalid || undefined}
        className={cn(
          "h-9 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15",
          invalid && "border-red-300 focus-visible:ring-red-500/15",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex h-9 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-[#0052CC] focus-within:ring-2 focus-within:ring-[#0052CC]/15",
        invalid && "border-red-300 focus-within:ring-red-500/15",
        containerClassName
      )}
    >
      <Icon className="size-4 shrink-0 text-slate-400" />
      <Input
        aria-invalid={invalid || undefined}
        className={cn(
          "h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-xs font-semibold shadow-none focus-visible:ring-0",
          className
        )}
        {...props}
      />
    </span>
  );
}

interface ProjectTextareaProps extends ComponentProps<typeof Textarea> {
  invalid?: boolean;
}

export function ProjectTextarea({
  invalid,
  className,
  ...props
}: ProjectTextareaProps) {
  return (
    <Textarea
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-20 rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15",
        invalid && "border-red-300 focus-visible:ring-red-500/15",
        className
      )}
      {...props}
    />
  );
}
