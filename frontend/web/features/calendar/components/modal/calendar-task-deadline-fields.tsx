"use client";

import { Target, X } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";
import { CustomTimePicker } from "@/components/ui/custom/custom-time-picker";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { QuickRow } from "./calendar-time-fields";
import type { CalendarTaskDeadline } from "../../types/calendar.types";

export function CalendarTaskDeadlineFields({ value, onChange, error, disabled }: {
  value: CalendarTaskDeadline;
  onChange: (deadline: CalendarTaskDeadline) => void;
  error?: string;
  disabled?: boolean;
}) {
  const errorId = useId();
  return <><QuickRow icon={<Target className="size-5" />}>
    {!value.enabled ? <Button type="button" variant="ghost" disabled={disabled} className="h-auto w-full justify-start rounded-control px-3 py-2 text-muted-foreground"
      onClick={() => onChange({ ...value, enabled: true })}>{copy.addDeadline}</Button> :
      <div className="flex min-w-0 items-start gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
          <CustomDatePicker ariaLabel={copy.deadline} value={value.date} required disabled={disabled}
            invalid={Boolean(error)} descriptionId={error ? errorId : undefined} onChange={(date) => onChange({ ...value, date })} />
          <CustomTimePicker ariaLabel={copy.deadlineTime} value={value.time} disabled={disabled}
            invalid={Boolean(error)} descriptionId={error ? errorId : undefined} onChange={(time) => onChange({ ...value, time })} />
        </div>
        <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={copy.removeDeadline}
          onClick={() => onChange({ enabled: false, date: "", time: "" })}><X className="size-4" /></Button>
      </div>}
  </QuickRow>{error && <p id={errorId} role="alert" className="ml-12 text-xs text-destructive-content">{error}</p>}</>;
}
