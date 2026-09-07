import { useWatch, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../schemas/calendar-event-form.schema";
import {
  composeDateTimeLocal,
  ensureMinimumEventEndAt,
  getDateInputValue,
  getTimeInputValue,
  hasMinimumEventDuration,
} from "../utils/calendar-date.utils";

export function useCalendarEventTime(
  form: UseFormReturn<CalendarEventEditorValues>,
) {
  const intl = useAppIntl();
  const { control, setValue } = form;
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });
  const allDay = useWatch({ control, name: "allDay" });

  const showRangeError = () => {
    toast.error(intl.formatMessage({ id: "calendar.invalidMinimumRange" }));
  };

  const handleStartDateChange = (nextDate: string) => {
    const nextStartAt = composeDateTimeLocal(
      nextDate,
      allDay ? "00:00" : getTimeInputValue(startAt),
    );
    const nextEndAt = allDay
      ? composeDateTimeLocal(getDateInputValue(endAt), "23:59")
      : endAt;

    setValue("startAt", nextStartAt, { shouldDirty: true });
    setValue(
      "endAt",
      hasMinimumEventDuration(nextStartAt, nextEndAt)
        ? nextEndAt
        : allDay
          ? composeDateTimeLocal(nextDate, "23:59")
          : ensureMinimumEventEndAt(nextStartAt, nextEndAt),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const handleStartTimeChange = (nextTime: string) => {
    const nextStartAt = composeDateTimeLocal(
      getDateInputValue(startAt),
      nextTime,
    );
    setValue("startAt", nextStartAt, { shouldDirty: true });
    setValue("endAt", ensureMinimumEventEndAt(nextStartAt, endAt), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleEndDateChange = (nextDate: string) => {
    const nextEndAt = composeDateTimeLocal(
      nextDate,
      allDay ? "23:59" : getTimeInputValue(endAt),
    );
    updateEndAt(nextEndAt);
  };

  const updateEndAt = (nextEndAt: string) => {
    if (!hasMinimumEventDuration(startAt, nextEndAt)) {
      showRangeError();
      return;
    }
    setValue("endAt", nextEndAt, { shouldDirty: true, shouldValidate: true });
  };

  const handleAllDayChange = (checked: boolean) => {
    setValue("allDay", checked, { shouldDirty: true });
    if (!checked) return;

    const nextStartAt = composeDateTimeLocal(getDateInputValue(startAt), "00:00");
    const nextEndAt = composeDateTimeLocal(getDateInputValue(endAt), "23:59");
    setValue("startAt", nextStartAt, { shouldDirty: true });
    setValue(
      "endAt",
      hasMinimumEventDuration(nextStartAt, nextEndAt)
        ? nextEndAt
        : composeDateTimeLocal(getDateInputValue(startAt), "23:59"),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  return {
    allDay,
    endAt,
    handleAllDayChange,
    handleEndDateChange,
    handleEndDateTimeChange: updateEndAt,
    handleStartDateChange,
    handleStartTimeChange,
    startAt,
  };
}
