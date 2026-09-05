export function normalizeTaskRank(value?: string): string | undefined {
  return value !== undefined && /^\d+$/.test(value) ? value.padStart(20, '0') : value;
}
