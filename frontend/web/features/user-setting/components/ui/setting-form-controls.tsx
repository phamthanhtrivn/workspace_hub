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
  description?: string;
  error?: string;
  className?: string;
}

export interface SettingInputProps
  extends React.ComponentProps<typeof Input>,
    SettingFieldProps {}

export const SettingInput = React.forwardRef<HTMLInputElement, SettingInputProps>(
  ({ label, description, error, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
            {label}
          </label>
        )}
        <Input
          {...props}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[props["aria-describedby"], description ? `${inputId}-description` : undefined, error ? `${inputId}-error` : undefined].filter(Boolean).join(" ") || undefined}
          ref={ref}
          className={cn(
            "h-10 rounded-control border bg-card px-3 text-sm font-semibold text-foreground transition-all placeholder:text-muted-foreground focus-visible:ring-2",
            error
              ? "border-destructive-outline focus-visible:ring-ring"
              : "border-input focus-visible:border-primary focus-visible:ring-ring",
            className,
          )}
        />
        {description && <p id={`${inputId}-description`} className="text-xs text-muted-foreground">{description}</p>}
        {error && <p id={`${inputId}-error`} role="alert" className="text-xs font-semibold text-destructive-content">{error}</p>}
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
          <span id={`${id}-label`} className="text-sm font-semibold text-foreground">{label}</span>
          <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
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
            "aria-invalid": Boolean(error) || undefined,
            getAriaValueText: (_, currentValue) => `${currentValue}${unit}`,
          }}
        />
        <div aria-hidden="true" className="flex justify-between text-xs font-medium tabular-nums text-muted-foreground">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
        {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-destructive-content">{error}</p>}
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
>(({ label, description, error, className, id, ...props }, ref) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <Textarea
        {...props}
        id={inputId}
        ref={ref}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[props["aria-describedby"], description ? `${inputId}-description` : undefined, error ? `${inputId}-error` : undefined].filter(Boolean).join(" ") || undefined}
        className={cn(
          "rounded-control border bg-card px-3 py-2.5 text-sm font-semibold text-foreground transition-all placeholder:text-muted-foreground focus-visible:ring-2 resize-none",
          error
            ? "border-destructive-outline focus-visible:ring-ring"
            : "border-input focus-visible:border-primary focus-visible:ring-ring",
          className,
        )}
      />
      {description && <p id={`${inputId}-description`} className="text-xs text-muted-foreground">{description}</p>}
      {error && <p id={`${inputId}-error`} role="alert" className="text-xs font-semibold text-destructive-content">{error}</p>}
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
      {label && <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>}
      <CustomSelect
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        ariaLabel={ariaLabel}
        disabled={disabled}
        triggerClassName="h-10 rounded-panel border-input bg-background px-4 text-sm font-semibold text-foreground focus:border-primary focus:ring-2 focus:ring-ring cursor-pointer"
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
        "flex items-center justify-between gap-3 p-4 bg-background rounded-panel border border-border transition-all",
        className,
      )}
    >
      <div>
        <label htmlFor={id} className="font-semibold text-foreground text-sm cursor-pointer">{title}</label>
        <p id={`${id}-description`} className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch
        id={id}
        aria-describedby={`${id}-description`}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="data-[state=checked]:bg-primary cursor-pointer"
      />
    </div>
  );
}
