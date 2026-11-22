import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveTimezone,
  toZonedDateTimeInput,
  fromZonedDateTimeInput,
  zonedDateKey,
  zonedDayBounds,
  formatInTimezone,
  formatDateOnly,
  parseUtcDate,
  getDisplayTimezone,
  setDisplayTimezone,
  subscribeDisplayTimezone,
} from "./timezone";
import {
  taskDateKey,
  toApiDateTime,
  isTaskOverdue,
} from "@/features/project/utils/task-dates";
import { createEndTimeOptions } from "@/features/calendar/utils/calendar-time-options";
import { getNotificationDateRange } from "@/features/notification/utils/notification-time-filter.utils";

test("missing and invalid preferences default to Vietnam; saved preferences are preserved", () => {
  assert.equal(resolveTimezone(), "Asia/Ho_Chi_Minh");
  assert.equal(resolveTimezone("invalid"), "Asia/Ho_Chi_Minh");
  assert.equal(resolveTimezone("America/New_York"), "America/New_York");
});

test("timestamp input round trips in the selected zone across midnight", () => {
  const instant = "2026-11-22T23:30:00.000Z";
  assert.equal(
    toZonedDateTimeInput(instant, "Asia/Ho_Chi_Minh"),
    "2026-11-23T06:30",
  );
  assert.equal(
    fromZonedDateTimeInput("2026-11-23T06:30", "Asia/Ho_Chi_Minh"),
    instant,
  );
  assert.equal(zonedDateKey(instant, "America/New_York"), "2026-11-22");
});

test("DST day boundaries use calendar days instead of fixed 24-hour offsets", () => {
  const bounds = zonedDayBounds("2026-03-08", "America/New_York");
  assert.equal(bounds.startAt, "2026-03-08T05:00:00.000Z");
  assert.equal(bounds.endAt, "2026-03-09T04:00:00.000Z");
});

test("skipped DST times are rejected and repeated times preserve the original instant on edit", () => {
  assert.throws(() =>
    fromZonedDateTimeInput("2026-03-08T02:30", "America/New_York"),
  );
  assert.equal(
    fromZonedDateTimeInput("2026-11-01T01:30", "America/New_York"),
    "2026-11-01T05:30:00.000Z",
  );
  assert.equal(
    fromZonedDateTimeInput(
      "2026-11-01T01:30",
      "America/New_York",
      "2026-11-01T06:30:17Z",
    ),
    "2026-11-01T06:30:17.000Z",
  );
});

test("date-only values and all-day deadlines retain their day while timed tasks move across zones", () => {
  const instant = "2026-11-22T02:00:00Z";
  assert.equal(taskDateKey(instant, false, "America/New_York"), "2026-11-21");
  assert.equal(taskDateKey(instant, true, "America/New_York"), "2026-11-22");
  assert.equal(toApiDateTime("2026-11-22", true), "2026-11-22T00:00:00.000Z");
  assert.equal(formatDateOnly("2026-11-22T00:00:00Z", "en-GB"), "22/11/2026");
  assert.equal(
    isTaskOverdue(
      { dueDate: "2026-11-22T00:00:00Z", allDay: true },
      new Date("2026-11-22T23:00:00Z"),
      "America/New_York",
    ),
    false,
  );
  assert.equal(
    isTaskOverdue(
      { dueDate: "2026-11-22T00:00:00Z", allDay: true },
      new Date("2026-11-23T05:01:00Z"),
      "America/New_York",
    ),
    true,
  );
});

test("clock options preserve wall times independently of the device and account offsets", () => {
  const options = createEndTimeOptions(
    "2026-11-22T09:00",
    "2026-11-22T10:00",
    "en-US",
  );
  assert.ok(
    options.some(
      (option) =>
        option.value === "2026-11-22T10:00" && option.label.startsWith("10:00"),
    ),
  );
  assert.equal(
    toZonedDateTimeInput("2026-11-22T23:30:00Z", "Asia/Kathmandu"),
    "2026-11-23T05:15",
  );
});

test("notification Today boundaries follow the selected account zone even when the UTC date differs", () => {
  const range = getNotificationDateRange("TODAY", {
    now: new Date("2026-11-22T23:30:00Z"),
    timeZone: "Asia/Ho_Chi_Minh",
  });
  assert.equal(range.fromDate, "2026-11-22T17:00:00.000Z");
  assert.equal(range.toDate, "2026-11-22T23:30:00.000Z");
  assert.equal(
    parseUtcDate("2026-11-22T02:00:00").toISOString(),
    "2026-11-22T02:00:00.000Z",
  );
  assert.equal(
    formatInTimezone(
      "2026-11-22T02:00:00",
      "en-GB",
      { hour: "2-digit", minute: "2-digit", hourCycle: "h23" },
      "Asia/Ho_Chi_Minh",
    ),
    "09:00",
  );
});

test("confirmed client preference changes notify subscribers and reset without leaking into SSR", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  let notifications = 0;
  const unsubscribe = subscribeDisplayTimezone(() => {
    notifications++;
  });
  try {
    setDisplayTimezone("America/New_York");
    assert.equal(getDisplayTimezone(), "America/New_York");
    setDisplayTimezone("America/New_York");
    assert.equal(notifications, 1);
    setDisplayTimezone();
    assert.equal(getDisplayTimezone(), "Asia/Ho_Chi_Minh");
  } finally {
    unsubscribe();
    setDisplayTimezone();
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
  assert.equal(getDisplayTimezone(), "Asia/Ho_Chi_Minh");
});
