function formatLocalDate(date: Date): string {
  return `${date.getFullYear().toString().padStart(4, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

export function getCurrentLocalDate(): string {
  return formatLocalDate(new Date());
}

export function getLatestBirthDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatLocalDate(yesterday);
}
