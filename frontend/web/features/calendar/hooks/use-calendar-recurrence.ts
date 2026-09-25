import { useMemo, useState } from "react";
import {
  CALENDAR_FORM_COPY as copy,
  CALENDAR_FORM_LOCALE,
} from "../constants/calendar-form-copy";
import { CALENDAR_RECURRENCE_PRESET_VALUES } from "../types/calendar.constants";
import { CalendarEvent } from "../types/calendar.types";
import {
  CalendarRecurrencePreset,
  buildCustomRecurrenceRule,
  getMonthDayName,
  getPresetRecurrenceRule,
  getRecurrencePresetFromRule,
  getWeekdayName,
  parseCustomRecurrenceRule,
} from "../utils/calendar-recurrence.utils";

export function useCalendarRecurrence(
  startAt: string,
  defaultStart: Date,
  event?: CalendarEvent | null,
) {
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(
    event?.recurrenceRule || null,
  );
  const [recurrencePreset, setRecurrencePreset] =
    useState<CalendarRecurrencePreset>(() =>
      getRecurrencePresetFromRule(event?.recurrenceRule, defaultStart),
    );
  const [customRecurrence, setCustomRecurrence] = useState(() =>
    parseCustomRecurrenceRule(event?.recurrenceRule, defaultStart),
  );
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);

  const handleRecurrenceChange = (preset: CalendarRecurrencePreset) => {
    if (preset === CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM) {
      setShowCustomRecurrence(true);
      return;
    }
    setRecurrencePreset(preset);
    setRecurrenceRule(getPresetRecurrenceRule(preset, new Date(startAt)));
  };

  const handleCustomRecurrenceSave = (
    recurrence: typeof customRecurrence,
  ) => {
    setCustomRecurrence(recurrence);
    setRecurrencePreset(CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM);
    setRecurrenceRule(buildCustomRecurrenceRule(recurrence));
    setShowCustomRecurrence(false);
  };

  const recurrenceOptions = useMemo(
    () => [
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.NONE,
        label: copy.recurrenceNone,
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.DAILY,
        label: copy.recurrenceDaily,
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
        label: copy.recurrenceWeeklyOn(
          getWeekdayName(new Date(startAt), CALENDAR_FORM_LOCALE),
        ),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY,
        label: copy.recurrenceMonthlyOn(new Date(startAt).getDate()),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY,
        label: copy.recurrenceYearlyOn(
          getMonthDayName(new Date(startAt), CALENDAR_FORM_LOCALE),
        ),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS,
        label: copy.recurrenceWeekdays,
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM,
        label: copy.recurrenceCustom,
      },
    ],
    [startAt],
  );

  return {
    closeCustomRecurrence: () => setShowCustomRecurrence(false),
    customRecurrence,
    getRecurrenceRule: (valuesStartAt: string) =>
      recurrencePreset === CALENDAR_RECURRENCE_PRESET_VALUES.NONE ||
      recurrencePreset === CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM
        ? recurrenceRule
        : getPresetRecurrenceRule(recurrencePreset, new Date(valuesStartAt)),
    handleCustomRecurrenceSave,
    handleRecurrenceChange,
    recurrenceOptions,
    recurrencePreset,
    showCustomRecurrence,
  };
}
