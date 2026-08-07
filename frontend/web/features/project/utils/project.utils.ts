/**
 * Creates the short project key shown in project cards and the project header.
 */
export function getProjectKey(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4) || "PRJ"
  );
}
