"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CustomDatePicker } from "./custom-date-picker";
import { CustomTimePicker } from "./custom-time-picker";
import { isDateTimePickerValue } from "./date-time-picker.utils";

interface CustomDateTimePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  descriptionId?: string;
  allowClear?: boolean;
  className?: string;
}

export function CustomDateField({ dateOnly, ...props }: CustomDateTimePickerProps & { dateOnly: boolean }) {
  return dateOnly ? <CustomDatePicker {...props} className={undefined} triggerClassName={props.className} /> : <CustomDateTimePicker {...props} />;
}

export function CustomDateTimePicker({ id, value, onChange, ariaLabel, min, max, disabled, invalid, descriptionId, allowClear = true, className }: CustomDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const valid = isDateTimePickerValue(draft, min, max);
  const displayed = value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)} ${value.slice(11, 16)}` : "Pick date & time";
  return <Popover open={open && !disabled} onOpenChange={(next) => { if (next) setDraft(value); setOpen(next); }}>
    <PopoverTrigger asChild><Button id={id} type="button" variant="outline" disabled={disabled} aria-label={ariaLabel} aria-invalid={invalid || undefined} aria-describedby={descriptionId}
      className={cn("w-full min-w-0 justify-start font-normal tabular-nums aria-invalid:border-destructive-outline", className)}>
      <CalendarClock aria-hidden className="size-4 shrink-0 text-muted-foreground" /><span className={cn("truncate", !value && "text-muted-foreground")}>{displayed}</span>
    </Button></PopoverTrigger>
    <PopoverContent align="start" className="w-72 max-w-[calc(100vw-1rem)] space-y-3 p-3" aria-label={ariaLabel}>
      <CustomDatePicker value={draft.split("T")[0]} ariaLabel={`${ariaLabel}: date`} min={min?.slice(0, 10)} max={max?.slice(0, 10)} allowClear={false}
        onChange={(date) => setDraft(`${date}T${draft.split("T")[1] ?? ""}`)} />
      <CustomTimePicker value={draft.split("T")[1] ?? ""} ariaLabel={`${ariaLabel}: time`} onChange={(time) => setDraft(`${draft.split("T")[0]}T${time}`)} />
      {draft && !valid && <p role="status" className="text-xs text-muted-foreground">Choose a date and time within the allowed range.</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
        {allowClear && <Button type="button" variant="ghost" size="sm" disabled={!value} onClick={() => { onChange(""); setOpen(false); }}>Clear</Button>}
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="button" size="sm" disabled={!valid} onClick={() => { if (valid) { if (draft !== value) onChange(draft); setOpen(false); } }}>Done</Button>
      </div>
    </PopoverContent>
  </Popover>;
}
