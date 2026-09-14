"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CustomSelect, CustomSelectOption } from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";

export interface SettingFieldProps {
  label?: string;
  error?: string;
  className?: string;
}

export interface SettingInputProps
  extends React.ComponentProps<typeof Input>,
    SettingFieldProps {}

export const SettingInput = React.forwardRef<HTMLInputElement, SettingInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={id} className="text-sm font-bold text-slate-700">
            {label}
          </label>
        )}
        <Input
          id={id}
          ref={ref}
          className={cn(
            "h-10 rounded-xl border bg-white px-3 text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400 focus-visible:ring-2",
            error
              ? "border-red-500 focus-visible:ring-red-500/20"
              : "border-slate-200 focus-visible:border-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]/20",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
      </div>
    );
  },
);
SettingInput.displayName = "SettingInput";

export interface SettingTextareaProps
  extends React.ComponentProps<typeof Textarea>,
    SettingFieldProps {}

export const SettingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  SettingTextareaProps
>(({ label, error, className, id, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={id} className="text-sm font-bold text-slate-700">
          {label}
        </label>
      )}
      <Textarea
        id={id}
        ref={ref}
        className={cn(
          "rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400 focus-visible:ring-2 resize-none",
          error
            ? "border-red-500 focus-visible:ring-red-500/20"
            : "border-slate-200 focus-visible:border-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]/20",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
});
SettingTextarea.displayName = "SettingTextarea";

export interface SettingSelectProps<TValue extends string = string> {
  label?: string;
  value: TValue;
  options: CustomSelectOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export function SettingSelect<TValue extends string = string>({
  label,
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
  className,
}: SettingSelectProps<TValue>) {
  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      {label && <label className="text-sm font-bold text-slate-700">{label}</label>}
      <CustomSelect
        value={value}
        options={options}
        onChange={onChange}
        ariaLabel={ariaLabel}
        disabled={disabled}
        triggerClassName="h-10 rounded-xl border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 cursor-pointer"
      />
    </div>
  );
}

export interface SettingSwitchCardProps {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SettingSwitchCard({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: SettingSwitchCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 transition-all",
        className,
      )}
    >
      <div>
        <p className="font-bold text-slate-800 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-[var(--color-primary)] cursor-pointer"
      />
    </div>
  );
}
