"use client";

import { Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { QuickRow } from "./calendar-time-fields";
import type { CalendarTaskDeadline } from "../../types/calendar.types";

export function CalendarTaskDeadlineFields({ value, onChange }: {
  value: CalendarTaskDeadline;
  onChange: (deadline: CalendarTaskDeadline) => void;
}) {
  return <QuickRow icon={<Target className="size-5" />}>
    {!value.enabled ? <Button type="button" variant="ghost" className="h-auto w-full justify-start rounded-xl px-3 py-2 text-slate-600"
      onClick={() => onChange({ ...value, enabled: true })}>{copy.addDeadline}</Button> :
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <Input type="date" aria-label={copy.deadline} value={value.date} required
          onChange={(event) => onChange({ ...value, date: event.target.value })} className="h-9 min-w-0 flex-1" />
        <Input type="time" aria-label="Deadline time" value={value.time}
          onChange={(event) => onChange({ ...value, time: event.target.value })} className="h-9 w-28" />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove deadline"
          onClick={() => onChange({ enabled: false, date: "", time: "" })}><X className="size-4" /></Button>
      </div>}
  </QuickRow>;
}
