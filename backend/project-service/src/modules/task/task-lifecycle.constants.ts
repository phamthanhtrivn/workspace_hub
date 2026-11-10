export const TASK_LIFECYCLE = {
  reopenRoute: 'tasks/:taskId/reopen',
  parentClosed: 'PARENT_TASK_CLOSED',
  parentClosedMessage: 'Reopen the parent task before reopening this subtask.',
} as const;
