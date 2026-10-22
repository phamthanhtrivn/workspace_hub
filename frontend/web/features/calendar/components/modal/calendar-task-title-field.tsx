"use client";

import { useId, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CALENDAR_TASK_TITLE_MAX_LENGTH } from "../../types/calendar.constants";

type CalendarTaskTitleFieldProps = ComponentProps<typeof Input> & {
  error?: string;
  wrapperClassName?: string;
};

export function CalendarTaskTitleField({ id, error, wrapperClassName, ...inputProps }: CalendarTaskTitleFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn("space-y-1.5", wrapperClassName)}>
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">{copy.taskTitle}</label>
      <Input required maxLength={CALENDAR_TASK_TITLE_MAX_LENGTH} placeholder={copy.addTitle} {...inputProps} id={inputId}
        aria-invalid={Boolean(error) || inputProps["aria-invalid"]}
        aria-describedby={[inputProps["aria-describedby"], error ? errorId : undefined].filter(Boolean).join(" ") || undefined} />
      {error && <p id={errorId} role="alert" className="text-xs text-destructive-content">{error}</p>}
    </div>
  );
}
