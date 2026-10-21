"use client";

import { useId, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDatePickerValue, parseDatePickerValue } from "./date-time-picker.utils";

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  descriptionId?: string;
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
}

export function CustomDatePicker({ value, onChange, ariaLabel, descriptionId, invalid, disabled, required, name, className }: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [missingRequired, setMissingRequired] = useState(false);
  const requiredErrorId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = parseDatePickerValue(value);
  return (
    <div className={cn("relative min-w-0", className)}>
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button ref={triggerRef} type="button" variant="outline" disabled={disabled}
            aria-label={ariaLabel} aria-invalid={invalid || missingRequired || undefined}
            aria-describedby={[descriptionId, missingRequired ? requiredErrorId : undefined].filter(Boolean).join(" ") || undefined}
            className="h-9 w-full min-w-0 justify-start gap-2 border-input px-3 font-normal aria-invalid:border-destructive-outline motion-reduce:transition-none">
            <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
            <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? format(selected, "dd/MM/yyyy") : "Pick a date"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-1rem)] overflow-hidden p-0" aria-label={ariaLabel}>
          <Calendar mode="single" required selected={selected} defaultMonth={selected} autoFocus onSelect={(date) => {
            onChange(formatDatePickerValue(date));
            setMissingRequired(false);
            setOpen(false);
          }} />
        </PopoverContent>
      </Popover>
      {required && <input type="text" className="sr-only" tabIndex={-1} aria-hidden="true" name={name} value={value} required disabled={disabled}
        onChange={(event) => onChange(event.target.value)} onInvalid={(event) => {
          event.preventDefault();
          setMissingRequired(true);
          if (event.currentTarget.form?.querySelector("input:invalid, select:invalid, textarea:invalid") === event.currentTarget) {
            triggerRef.current?.focus();
            setOpen(true);
          }
        }} />}
      {missingRequired && <p id={requiredErrorId} role="alert" className="mt-1 text-xs text-destructive-content">Pick a date.</p>}
    </div>
  );
}
