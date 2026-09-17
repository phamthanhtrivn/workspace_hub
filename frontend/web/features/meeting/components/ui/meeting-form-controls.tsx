"use client";

import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";

type MeetingControlSize = "sm" | "md" | "lg";
type MeetingButtonTone =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

const meetingButtonToneClass: Record<MeetingButtonTone, string> = {
  primary:
    "bg-[#0052CC] text-white shadow-[0_12px_24px_rgba(0,82,204,0.18)] hover:bg-[#0747A6] active:translate-y-px",
  secondary:
    "bg-slate-100 text-[#172B4D] hover:bg-slate-200 active:translate-y-px",
  outline:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-[#0052CC] active:translate-y-px",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-[#172B4D] active:translate-y-px",
  danger:
    "bg-red-600 text-white shadow-[0_12px_24px_rgba(220,38,38,0.16)] hover:bg-red-500 active:translate-y-px",
};

const meetingButtonSizeClass: Record<MeetingControlSize, string> = {
  sm: "h-9 rounded-lg px-3 text-xs",
  md: "h-10 rounded-lg px-4 text-sm",
  lg: "h-11 rounded-lg px-5 text-sm",
};

interface MeetingButtonProps
  extends Omit<ComponentProps<typeof Button>, "variant" | "size"> {
  tone?: MeetingButtonTone;
  controlSize?: MeetingControlSize;
}

export function MeetingButton({
  tone = "primary",
  controlSize = "md",
  className,
  ...props
}: MeetingButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "cursor-pointer font-black transition duration-200 focus-visible:ring-2 focus-visible:ring-[#0052CC]/30 disabled:cursor-not-allowed disabled:opacity-60",
        meetingButtonToneClass[tone],
        meetingButtonSizeClass[controlSize],
        className,
      )}
      {...props}
    />
  );
}

interface MeetingInputProps extends ComponentProps<typeof Input> {
  icon?: LucideIcon;
  invalid?: boolean;
  containerClassName?: string;
}

export function MeetingInput({
  icon: Icon,
  invalid,
  className,
  containerClassName,
  ...props
}: MeetingInputProps) {
  if (!Icon) {
    return (
      <Input
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 rounded-lg border-slate-200 bg-white text-sm font-semibold text-[#172B4D] shadow-sm placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-[#0052CC]/15",
          invalid && "border-red-300 focus-visible:ring-red-500/15",
          className,
        )}
        {...props}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-[#0052CC] focus-within:ring-2 focus-within:ring-[#0052CC]/15",
        invalid && "border-red-300 focus-within:ring-red-500/15",
        containerClassName,
      )}
    >
      <Icon className="size-4 shrink-0 text-slate-400" />
      <Input
        aria-invalid={invalid || undefined}
        className={cn(
          "h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-0 font-semibold shadow-none focus-visible:ring-0",
          className,
        )}
        {...props}
      />
    </span>
  );
}

interface MeetingTextareaProps extends ComponentProps<typeof Textarea> {
  invalid?: boolean;
}

export function MeetingTextarea({
  invalid,
  className,
  ...props
}: MeetingTextareaProps) {
  return (
    <Textarea
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-24 rounded-lg border-slate-200 bg-white text-sm font-semibold text-[#172B4D] shadow-sm placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-[#0052CC]/15",
        invalid && "border-red-300 focus-visible:ring-red-500/15",
        className,
      )}
      {...props}
    />
  );
}

interface MeetingSelectProps<TValue extends string = string> {
  value: TValue;
  options: CustomSelectOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function MeetingSelect<TValue extends string = string>({
  triggerClassName,
  contentClassName,
  ...props
}: MeetingSelectProps<TValue>) {
  return (
    <CustomSelect
      triggerClassName={cn(
        "h-10 rounded-lg border-slate-200 bg-white text-sm font-black text-[#172B4D] shadow-sm hover:border-blue-200 hover:bg-blue-50 data-[state=open]:border-[#0052CC] data-[state=open]:ring-[#0052CC]/15",
        triggerClassName,
      )}
      contentClassName={cn("rounded-lg border-slate-200", contentClassName)}
      {...props}
    />
  );
}

