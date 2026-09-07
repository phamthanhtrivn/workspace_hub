export function formatMeetingSummaryMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

export function formatMeetingSummaryAverageParticipants(value: number) {
  const safeValue = Math.max(0, value);

  if (Number.isInteger(safeValue)) return String(safeValue);

  return safeValue.toFixed(1);
}
