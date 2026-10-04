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
      <CalendarSelect value={recurrencePreset} options={recurrenceOptions} ariaLabel={copy.recurrence}
        onChange={(value) => onRecurrenceChange(value as CalendarRecurrencePreset)} alignItemWithTrigger={false}
        triggerClassName="h-10 w-full justify-between rounded-xl border border-slate-200/70 bg-slate-100/80 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-200/70 data-[state=open]:bg-white"
        popupClassName="min-w-[15.5rem]" />
    </QuickRow>
  </div>;
}
