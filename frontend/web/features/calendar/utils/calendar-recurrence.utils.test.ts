import { describe, expect, it } from "vitest";
import { CALENDAR_RECURRENCE_PRESET_VALUES } from "../types/calendar.constants";
import {
  buildCustomRecurrenceRule,
  getPresetRecurrenceRule,
  getRecurrencePresetFromRule,
  parseCustomRecurrenceRule,
} from "./calendar-recurrence.utils";

describe("calendar recurrence utilities", () => {
  const monday = new Date("2026-08-31T09:00:00.000Z");

  it("serializes and recognizes a weekly preset", () => {
    const rule = getPresetRecurrenceRule(
      CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
      monday,
    );

    expect(rule).toBe("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO");
    expect(getRecurrencePresetFromRule(rule, monday)).toBe(
      CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
    );
  });

  it("round-trips a custom weekday rule with a count", () => {
    const rule = buildCustomRecurrenceRule({
      frequency: "WEEKLY",
      interval: 2,
      weekdays: ["MO", "WE"],
      endType: "after",
      count: 4,
    });

    expect(parseCustomRecurrenceRule(rule, monday)).toEqual({
      frequency: "WEEKLY",
      interval: 2,
      weekdays: ["MO", "WE"],
      endType: "after",
      count: 4,
    });
    expect(getRecurrencePresetFromRule(rule, monday)).toBe(
      CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM,
    );
  });

  it("returns a safe fallback for malformed rules", () => {
    expect(parseCustomRecurrenceRule("not-an-rrule", monday)).toEqual({
      frequency: "WEEKLY",
      interval: 1,
      weekdays: ["MO"],
      endType: "never",
    });
  });
});
