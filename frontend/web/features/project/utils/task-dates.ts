const pad = (value: number) => String(value).padStart(2, "0");

export function taskDateKey(value?: string | null, allDay = false): string {
  if (!value) return "";
  if (allDay || value.length === 10) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDateTimeInput(value?: string | null): string {
  if (!value) return "";
  if (value.length === 10) return `${value}T09:00`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${taskDateKey(value)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toApiDateTime(value: string, allDay: boolean): string | null {
  if (!value) return null;
  const date = new Date(allDay ? `${value.slice(0, 10)}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) throw new Error("Ngày giờ không hợp lệ");
  return date.toISOString();
}
