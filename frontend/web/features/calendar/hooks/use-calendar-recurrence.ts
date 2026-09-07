import { useMemo, useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
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
  const intl = useAppIntl();
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
        label: intl.formatMessage({ id: "calendar.recurrence.none" }),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.DAILY,
        label: intl.formatMessage({ id: "calendar.recurrence.daily" }),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
        label: intl.formatMessage(
          { id: "calendar.recurrence.weeklyOn" },
          { weekday: getWeekdayName(new Date(startAt), intl.locale) },
        ),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY,
        label: intl.formatMessage(
          { id: "calendar.recurrence.monthlyOn" },
          { day: new Date(startAt).getDate() },
        ),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY,
        label: intl.formatMessage(
          { id: "calendar.recurrence.yearlyOn" },
          { date: getMonthDayName(new Date(startAt), intl.locale) },
        ),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS,
        label: intl.formatMessage({ id: "calendar.recurrence.weekdays" }),
      },
      {
        value: CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM,
        label: intl.formatMessage({ id: "calendar.recurrence.custom" }),
      },
    ],
    [intl, startAt],
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
