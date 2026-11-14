import { useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { getDateRangeErrors, hasDateRangeErrors } from "@/lib/date-range";
import { useScheduleToday } from "@/hooks/use-schedule-today";
import { CALENDAR_MIN_EVENT_DURATION_MS } from "../types/calendar.constants";
import type { CalendarEventEditorValues } from "../schemas/calendar-event-form.schema";
import { addMinutesToDateTimeLocal, composeDateTimeLocal, getDateInputValue, getTimeInputValue } from "../utils/calendar-date.utils";

export function useCalendarEventTime(form: UseFormReturn<CalendarEventEditorValues>, mode: "create" | "edit") {
  const { control, setValue } = form;
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });
  const allDay = useWatch({ control, name: "allDay" });
  const allowPastStart = true;
  const { today, refreshToday } = useScheduleToday();

  const updateRange = (nextStart: string, nextEnd: string, field: "startAt" | "endAt") => {
    const errors = getDateRangeErrors({ start: nextStart, end: nextEnd, mode, today: refreshToday(),
      minDurationMs: CALENDAR_MIN_EVENT_DURATION_MS, allowPastStart });
    if (hasDateRangeErrors(errors)) {
      const message = errors.start || errors.end!;
      form.setError(field, { type: "validate", message });
      toast.error(message);
      return false;
    }
    form.clearErrors(["startAt", "endAt"]);
    setValue("startAt", nextStart, { shouldDirty: true });
    setValue("endAt", nextEnd, { shouldDirty: true });
    void form.trigger(["startAt", "endAt"]);
    return true;
  };

  const updateStartTime = (nextStart: string) => {
    const duration = new Date(endAt).getTime() - new Date(startAt).getTime();
    const minutes = Number.isFinite(duration)
      ? Math.max(duration, CALENDAR_MIN_EVENT_DURATION_MS) / 60_000
      : 60;
    updateRange(nextStart, addMinutesToDateTimeLocal(nextStart, minutes), "startAt");
  };
  const handleStartDateChange = (date: string) => {
    if (!date) { updateRange("", "", "startAt"); return; }
    updateRange(
      composeDateTimeLocal(date, allDay ? "00:00" : getTimeInputValue(startAt)),
      endAt,
      "startAt",
    );
  };
  const handleStartTimeChange = (time: string) => {
    if (!startAt) return;
    updateStartTime(composeDateTimeLocal(getDateInputValue(startAt), time));
  };
  const updateEndAt = (nextEnd: string) => { updateRange(startAt, nextEnd, "endAt"); };
  const handleEndDateChange = (date: string) => {
    if (!date) { updateEndAt(""); return; }
    const defaultEnd = addMinutesToDateTimeLocal(startAt, CALENDAR_MIN_EVENT_DURATION_MS / 60_000);
    updateEndAt(composeDateTimeLocal(date, allDay ? "23:59" : getTimeInputValue(endAt || defaultEnd)));
  };
  const handleAllDayChange = (checked: boolean) => {
    const nextStart = startAt && checked ? composeDateTimeLocal(getDateInputValue(startAt), "00:00") : startAt;
    const nextEnd = endAt && checked ? composeDateTimeLocal(getDateInputValue(endAt), "23:59") : endAt;
    if (updateRange(nextStart, nextEnd, "endAt")) {
      setValue("allDay", checked, { shouldDirty: true, shouldValidate: true });
    }
  };

  return {
    allDay, endAt, startAt, mode, today, refreshToday,
    handleEndDateChange, handleEndDateTimeChange: updateEndAt,
    handleAllDayChange, handleStartDateChange, handleStartTimeChange,
  };
}
