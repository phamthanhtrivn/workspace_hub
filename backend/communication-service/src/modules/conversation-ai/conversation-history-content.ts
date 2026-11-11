export type HistoryResource = {
  type?: string;
  content: string | null;
  noteTitle?: string | null;
  noteContent?: string | null;
  poll?: {
    title: string;
    multipleChoice: boolean;
    anonymous: boolean;
    isLocked: boolean;
    expiresAt: string | null;
    optionCount: number;
    options: { text: string; votes: number }[];
  } | null;
};

export function historyContent(resource: HistoryResource): string {
  if (resource.type === 'NOTE') {
    return `[NOTE]\n${resource.noteTitle ?? ''}\n${resource.noteContent ?? ''}`;
  }
  if (resource.type === 'POLL' && resource.poll) {
    const poll = resource.poll;

    return [
      `[POLL] ${poll.title}`,
      `Multiple choice: ${poll.multipleChoice}; anonymous: ${poll.anonymous}; locked: ${poll.isLocked}; expires: ${poll.expiresAt ?? 'none'}`,
      ...poll.options.map(
        (option) => `- ${option.text}: ${option.votes} votes`,
      ),
      ...(poll.optionCount > poll.options.length
        ? ['Additional options omitted.']
        : []),
      'Counts are selections per option, not necessarily unique voters.',
    ].join('\n');
  }
  if (resource.type === 'TASK') {
    try {
      const task = JSON.parse(resource.content ?? '') as Record<
        string,
        unknown
      >;
      const value = (key: string) =>
        typeof task[key] === 'string' ? task[key].slice(0, 300) : null;
      if (task.deleted === true)
        return '[TASK] This task was deleted; do not treat it as active.';

      return JSON.stringify({
        type: 'TASK',
        taskId: value('taskId'),
        projectId: value('projectId'),
        title: value('title'),
        status: value('status'),
        priority: value('priority'),
        dueDate: value('dueDate'),
        source: 'shared task card snapshot; not a live Project task lookup',
      });
    } catch {
      return `[TASK CARD SNAPSHOT]\n${resource.content ?? ''}`;
    }
  }

  return resource.content ?? '';
}
