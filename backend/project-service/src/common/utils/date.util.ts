export function parseOptionalDate(value?: string): Date | undefined {
  return value === undefined ? undefined : new Date(value);
}

export function isValidDateRange(
  startDate?: Date | null,
  endDate?: Date | null,
): boolean {
  return !(startDate && endDate) || startDate <= endDate;
}
