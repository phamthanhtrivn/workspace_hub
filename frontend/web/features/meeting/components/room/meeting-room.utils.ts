export function buildParticipantInitials(name: string) {
  const [firstPart, secondPart] = name.split(/[\s@.]+/).filter(Boolean);
  return `${firstPart?.[0] ?? ""}${secondPart?.[0] ?? ""}`.toUpperCase() || "ME";
}
