"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-bold text-slate-700">
            {label}
          </label>
        )}
        <Input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
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
        {error && <p id={`${inputId}-error`} role="alert" className="text-xs font-semibold text-red-500">{error}</p>}
      </div>
    );
  },
);
SettingInput.displayName = "SettingInput";

export interface SettingSliderProps extends SettingFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export const SettingSlider = React.forwardRef<HTMLInputElement, SettingSliderProps>(
  ({ label, value, onChange, onBlur, disabled, error, className, min = 0, max = 100, step = 1, unit = "" }, ref) => {
    const id = React.useId();
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center justify-between gap-3">
          <span id={`${id}-label`} className="text-sm font-bold text-slate-700">{label}</span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold tabular-nums text-slate-700">
            {value}{unit}
          </span>
        </div>
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-labelledby={`${id}-label`}
          onValueChange={(values) => onChange(typeof values === "number" ? values : values[0])}
          thumbProps={{
            inputRef: ref,
            onBlur,
            "aria-describedby": error ? `${id}-error` : undefined,
            getAriaValueText: (_, currentValue) => `${currentValue}${unit}`,
          }}
        />
        <div aria-hidden="true" className="flex justify-between text-xs font-medium tabular-nums text-slate-400">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
        {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-red-500">{error}</p>}
      </div>
    );
  },
);
SettingSlider.displayName = "SettingSlider";

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
  const id = React.useId();
  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      {label && <label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label>}
      <CustomSelect
        id={id}
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
  const id = React.useId();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 transition-all",
        className,
      )}
    >
      <div>
        <label htmlFor={id} className="font-bold text-slate-800 text-sm cursor-pointer">{title}</label>
        <p id={`${id}-description`} className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <Switch
        id={id}
        aria-describedby={`${id}-description`}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-[var(--color-primary)] cursor-pointer"
      />
    </div>
  );
}
