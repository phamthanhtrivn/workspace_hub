import { z } from "zod";
import type { Interval } from "./work-assistant.types";
export const timeZoneSchema = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Invalid time zone");
export function dateKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function addDays(day: string, count: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
// Resolve wall time independently on each date so DST does not shift working hours.
export function wallTime(day: string, minute: number, timeZone: string) {
  if (minute === 1440) return wallTime(addDays(day, 1), 0, timeZone);
  const target = Date.parse(day + "T00:00:00Z") + minute * 60000;
  let instant = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value]),
    );
    const local = Date.parse(
      parts.year +
        "-" +
        parts.month +
        "-" +
        parts.day +
        "T" +
        parts.hour +
        ":" +
        parts.minute +
        ":" +
        parts.second +
        "Z",
    );
    const delta = target - local;
    if (!delta) return new Date(instant);
    instant += delta;
  }
  throw new Error("Working time falls in an invalid local clock interval");
}
export function workRange(now: Date, timeZone: string, days: 7 | 30) {
  const today = dateKey(now, timeZone);
  return {
    today,
    from: wallTime(addDays(today, 1 - days), 0, timeZone).toISOString(),
    to: wallTime(addDays(today, 1), 0, timeZone).toISOString(),
    windowStart: wallTime(today, 0, timeZone).toISOString(),
    windowEnd: wallTime(addDays(today, 7), 0, timeZone).toISOString(),
  };
}
export function freeSlots(
  now: Date,
  timeZone: string,
  busy: Interval[],
  incomplete: boolean,
): Interval[] {
  if (incomplete) return [];
  const blocks = busy.map((b) => [Date.parse(b.startAt), Date.parse(b.endAt)]);
  if (
    blocks.some(
      ([start, end]) =>
        !Number.isFinite(start) || !Number.isFinite(end) || end <= start,
    )
  )
    return [];
  blocks.sort((a, b) => a[0] - b[0]);
  const today = dateKey(now, timeZone);
  const slots: Interval[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(today, offset);
    const start = Math.max(
      wallTime(day, 0, timeZone).getTime(),
      Math.ceil(now.getTime() / 60000) * 60000,
    );
    const end = wallTime(addDays(day, 1), 0, timeZone).getTime();
    let cursor = start;
    for (const [a, b] of blocks) {
      if (b <= cursor || a >= end) continue;
      if (a - cursor >= 25 * 60000)
        slots.push({
          startAt: new Date(cursor).toISOString(),
          endAt: new Date(Math.min(a, end)).toISOString(),
        });
      cursor = Math.max(cursor, b);
    }
    if (end - cursor >= 25 * 60000)
      slots.push({
        startAt: new Date(cursor).toISOString(),
        endAt: new Date(end).toISOString(),
      });
  }
  return slots.slice(0, 40);
}
