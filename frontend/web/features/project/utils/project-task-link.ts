const PROJECT_RESOURCE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isProjectResourceId(value: string): boolean {
  return PROJECT_RESOURCE_ID_PATTERN.test(value);
}

export function getProjectTaskLink(projectId: string, taskId: string): string | undefined {
  return isProjectResourceId(projectId) && isProjectResourceId(taskId)
    ? `/projects/${projectId}?taskId=${taskId}` : undefined;
}
