"use client";

import { useId, useRef, useState, type Ref, type FocusEventHandler } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDatePickerValue, parseDatePickerValue } from "./date-time-picker.utils";

const PAST_NAVIGATION_YEARS = 120;
const FUTURE_NAVIGATION_YEARS = 20;

interface CustomDatePickerProps {
  id?: string;
  ref?: Ref<HTMLButtonElement>;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  descriptionId?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
  triggerClassName?: string;
  min?: string;
  max?: string;
  allowClear?: boolean;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

export function CustomDatePicker({ id, ref, value, onChange, ariaLabel, descriptionId, invalid, disabled, required, name, className, triggerClassName, min, max, allowClear = !required, onBlur }: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [missingRequired, setMissingRequired] = useState(false);
  const requiredErrorId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = parseDatePickerValue(value);
  const minDate = min ? parseDatePickerValue(min) : undefined;
  const maxDate = max ? parseDatePickerValue(max) : undefined;
  const outsideRange = Boolean(value && ((min && value < min) || (max && value > max)));
  const validationMessage = !value ? (required ? "Pick a date." : "")
    : !selected ? "Choose a valid date."
    : min && value < min ? `Choose a date on or after ${min}.`
    : max && value > max ? `Choose a date on or before ${max}.` : "";
  return (
    <div className={cn("relative min-w-0", className)}>
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} ref={(node) => { triggerRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }} onBlur={onBlur} type="button" variant="outline" disabled={disabled}
            aria-label={ariaLabel} aria-invalid={invalid || missingRequired || outsideRange || undefined}
            aria-describedby={[descriptionId, missingRequired ? requiredErrorId : undefined].filter(Boolean).join(" ") || undefined}
            className={cn("h-9 w-full min-w-0 justify-start gap-2 border-input px-3 font-normal aria-invalid:border-destructive-outline motion-reduce:transition-none", triggerClassName)}>
            <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
            <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? format(selected, "dd/MM/yyyy") : "Pick a date"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] overflow-hidden p-0" aria-label={ariaLabel}>
          <Calendar mode="single" required selected={selected} defaultMonth={selected} captionLayout="dropdown"
            startMonth={minDate ?? new Date(new Date().getFullYear() - PAST_NAVIGATION_YEARS, 0)} endMonth={maxDate ?? new Date(new Date().getFullYear() + FUTURE_NAVIGATION_YEARS, 11)}
            disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]} autoFocus onSelect={(date) => {
            onChange(formatDatePickerValue(date));
            setMissingRequired(false);
            setOpen(false);
          }} />
          {allowClear && <div className="border-t border-border p-2"><Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => { onChange(""); setMissingRequired(false); setOpen(false); }}>Clear date</Button></div>}
        </PopoverContent>
      </Popover>
      {(required || name || min || max) && <input ref={(node) => node?.setCustomValidity(validationMessage)} type="text" className="sr-only" tabIndex={-1} aria-hidden="true" name={name} value={value} required={required} disabled={disabled}
        onChange={(event) => onChange(event.target.value)} onInvalid={(event) => {
          event.preventDefault();
          setMissingRequired(true);
          if (event.currentTarget.form?.querySelector("input:invalid, select:invalid, textarea:invalid") === event.currentTarget) {
            triggerRef.current?.focus();
            setOpen(true);
          }
        }} />}
      {missingRequired && validationMessage && <p id={requiredErrorId} role="alert" className="mt-1 text-xs text-destructive-content">{validationMessage}</p>}
    </div>
  );
}
