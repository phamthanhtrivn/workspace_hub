"use client";

import { useId, useState } from "react";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CustomSelect } from "./custom-select";
import { parseTimePickerValue } from "./date-time-picker.utils";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({ value: String(hour).padStart(2, "0"), label: String(hour).padStart(2, "0") }));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => ({ value: String(minute).padStart(2, "0"), label: String(minute).padStart(2, "0") }));

interface CustomTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  descriptionId?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CustomTimePicker({ value, onChange, ariaLabel, descriptionId, invalid, disabled, className }: CustomTimePickerProps) {
  const [open, setOpen] = useState(false);
  const fieldId = useId();
  const { hour, minute } = parseTimePickerValue(value);
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled} aria-label={ariaLabel} aria-describedby={descriptionId} aria-invalid={invalid || undefined}
          className={cn("h-9 min-w-0 justify-start gap-2 border-input px-3 font-normal tabular-nums aria-invalid:border-destructive-outline motion-reduce:transition-none", className)}>
          <Clock3 aria-hidden className="size-4 text-muted-foreground" />
          <span className={cn(!hour && "text-muted-foreground")}>{hour ? `${hour}:${minute}` : "Add time"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 max-w-[calc(100vw-1.5rem)] p-3" aria-label={ariaLabel}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-hour`} className="text-xs font-medium text-muted-foreground">Hour</label>
            <CustomSelect id={`${fieldId}-hour`} value={hour} options={HOUR_OPTIONS} ariaLabel={`${ariaLabel}: hour`} placeholder="HH" disabled={disabled}
              onChange={(nextHour) => onChange(`${nextHour}:${minute || "00"}`)} triggerClassName="font-normal tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${fieldId}-minute`} className="text-xs font-medium text-muted-foreground">Minute</label>
            <CustomSelect id={`${fieldId}-minute`} value={minute} options={MINUTE_OPTIONS} ariaLabel={`${ariaLabel}: minute`} placeholder="mm" disabled={disabled}
              onChange={(nextMinute) => onChange(`${hour || "00"}:${nextMinute}`)} triggerClassName="font-normal tabular-nums" />
          </div>
        </div>
        <div className="mt-3 flex justify-between gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" size="sm" disabled={disabled || !value} onClick={() => { onChange(""); setOpen(false); }}>Clear time</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Done</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
