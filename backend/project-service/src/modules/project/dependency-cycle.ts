export interface DependencyEdge {
  predecessorTaskId: string;
  successorTaskId: string;
}

export function wouldCreateDependencyCycle(
  edges: DependencyEdge[],
  predecessorTaskId: string,
  successorTaskId: string,
): boolean {
  const successors = new Map<string, string[]>();
  for (const edge of edges) {
    const adjacent = successors.get(edge.predecessorTaskId) ?? [];
    adjacent.push(edge.successorTaskId);
    successors.set(edge.predecessorTaskId, adjacent);
  }

  const pending = [successorTaskId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const taskId = pending.pop();
    if (!taskId || visited.has(taskId)) continue;
    if (taskId === predecessorTaskId) return true;
    visited.add(taskId);
    pending.push(...(successors.get(taskId) ?? []));
  }
  return false;
}
