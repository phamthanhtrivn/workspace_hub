"use client";

import type { CalendarRecurrencePreset } from "../../utils/calendar-recurrence.utils";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CalendarTimeFields, QuickRow, type CalendarTimeFieldsProps } from "./calendar-time-fields";
import { CalendarSelect } from "./calendar-select";

export { QuickRow } from "./calendar-time-fields";
export type QuickCreateKind = "event" | "task";

interface QuickCreateTimeSectionProps extends CalendarTimeFieldsProps {
  kind: QuickCreateKind;
  recurrencePreset: CalendarRecurrencePreset;
  recurrenceOptions: Array<{ value: string; label: string }>;
  onRecurrenceChange: (preset: CalendarRecurrencePreset) => void;
}

export function QuickCreateTimeSection({ kind, recurrencePreset, recurrenceOptions,
  onRecurrenceChange, ...timeProps }: QuickCreateTimeSectionProps) {
  return <div className="space-y-2">
    <CalendarTimeFields {...timeProps} showTimeZone={kind === "event"} />
    <QuickRow icon={null}>
      <CalendarSelect disabled={timeProps.disabled} value={recurrencePreset} options={recurrenceOptions} ariaLabel={copy.recurrence}
        onChange={(value) => onRecurrenceChange(value as CalendarRecurrencePreset)} alignItemWithTrigger={false}
        triggerClassName="h-10 w-full justify-between rounded-panel border border-input bg-muted px-3 text-sm font-semibold text-muted-foreground hover:bg-accent/70 data-[state=open]:bg-card"
        popupClassName="min-w-[15.5rem]" />
    </QuickRow>
  </div>;
}
