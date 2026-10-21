import { format, isValid, parseISO } from "date-fns";

export function parseDatePickerValue(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : undefined;
}

export function formatDatePickerValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseTimePickerValue(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return { hour: match?.[1] ?? "", minute: match?.[2] ?? "" };
}

/** Local input strings stay local; API conversion belongs to the feature. */
export function isDateTimePickerValue(value: string, min?: string, max?: string): boolean {
  return value.length === 16 && value[10] === "T" && Boolean(parseDatePickerValue(value.slice(0, 10))) &&
    Boolean(parseTimePickerValue(value.slice(11)).hour) && (!min || value >= min) && (!max || value <= max);
}
