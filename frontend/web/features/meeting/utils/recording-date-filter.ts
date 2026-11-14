import { parseDatePickerValue } from "@/components/ui/custom/date-time-picker.utils";

export interface RecordingDateFilter {
  from: string;
  to: string;
}

/** Selected calendar days are inclusive in the viewer's timezone; the API end is exclusive. */
export function recordingDateBounds({ from, to }: RecordingDateFilter) {
  const start = from ? parseDatePickerValue(from) : undefined;
  const end = to ? parseDatePickerValue(to) : undefined;
  const invalid = Boolean(
    (from && !start) || (to && !end) || (start && end && start > end),
  );

  return {
    invalid,
    fromDate: !invalid && start ? start.toISOString() : undefined,
    toDate:
      !invalid && end
        ? new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate() + 1,
          ).toISOString()
        : undefined,
  };
}
