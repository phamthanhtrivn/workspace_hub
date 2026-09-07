import {
  DEFAULT_PROJECT_KEY,
  MAX_PROJECT_KEY_LENGTH,
} from "../constants/project.constants";

export function getProjectKey(name: string): string {
  return (
    name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, MAX_PROJECT_KEY_LENGTH) || DEFAULT_PROJECT_KEY
  );
}
