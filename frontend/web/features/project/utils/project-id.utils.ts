import { PROJECT_ID_SUFFIX_LENGTH } from "../constants/project.constants";

export function getProjectIdSuffix(projectId?: string | null): string {
  const normalizedProjectId = projectId?.trim();

  if (!normalizedProjectId) {
    return "";
  }

  return normalizedProjectId.slice(-PROJECT_ID_SUFFIX_LENGTH);
}
