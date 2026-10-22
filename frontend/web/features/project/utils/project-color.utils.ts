import type { CSSProperties } from "react";

export function getProjectColorStyle(
  color?: string | null,
): CSSProperties & { "--project-color": string } {
  return { "--project-color": color?.trim() || "var(--primary)" };
}
