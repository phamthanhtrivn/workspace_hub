import { getDisplayTimezone, zonedDayBounds } from "@/lib/timezone";
export interface RecordingDateFilter { from: string; to: string }
/** Selected days are inclusive in the account timezone; the API end is exclusive. */
export function recordingDateBounds({ from, to }: RecordingDateFilter, timeZone = getDisplayTimezone()) {
  try {
    const fromDate = from ? zonedDayBounds(from, timeZone).startAt : undefined;
    const toDate = to ? zonedDayBounds(to, timeZone).endAt : undefined;
    if (from && to && from > to) return { invalid: true, fromDate: undefined, toDate: undefined };
    return { invalid: false, fromDate, toDate };
  } catch { return { invalid: true, fromDate: undefined, toDate: undefined }; }
}
