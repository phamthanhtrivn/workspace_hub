type RelativeTimeFormatter = (
  value: number,
  unit: "minute" | "hour" | "day",
) => string;

interface RelativeTaskTimeOptions {
  value: string;
  now: number;
  formatRelativeTime: RelativeTimeFormatter;
  formatDate: (value: Date) => string;
}

export function formatTaskRelativeTime({
  value,
  now,
  formatRelativeTime,
  formatDate,
}: RelativeTaskTimeOptions): string {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "";

  const difference = timestamp - now;
  const absoluteDifference = Math.abs(difference);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absoluteDifference < hour) {
    const minutes = Math.max(1, Math.round(absoluteDifference / minute));
    return formatRelativeTime(difference < 0 ? -minutes : minutes, "minute");
  }
  if (absoluteDifference < day) {
    const hours = Math.max(1, Math.round(absoluteDifference / hour));
    return formatRelativeTime(difference < 0 ? -hours : hours, "hour");
  }
  if (absoluteDifference <= 30 * day) {
    const days = Math.max(1, Math.round(absoluteDifference / day));
    return formatRelativeTime(difference < 0 ? -days : days, "day");
  }
  return formatDate(date);
}
