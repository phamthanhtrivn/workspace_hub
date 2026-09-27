const DEADLINE_MARKER = /\[(?:Hạn chót|Deadline):\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\]/gi;

export function readTaskDeadline(description: string | null | undefined) {
  const match = description?.match(DEADLINE_MARKER)?.[0];
  const fields = match?.match(/:\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/);
  return {
    date: fields?.[1] ?? "",
    time: fields?.[2] ?? "",
  };
}

export function writeTaskDeadline(
  description: string,
  deadlineDate: string,
  deadlineTime: string,
  enabled: boolean,
) {
  const withoutDeadlines = description.replace(DEADLINE_MARKER, "").trim();
  const taskDescription = withoutDeadlines.includes("[TASK]")
    ? withoutDeadlines
    : withoutDeadlines
      ? `[TASK] ${withoutDeadlines}`
      : "[TASK]";

  if (!enabled || !deadlineDate) return taskDescription;
  return `${taskDescription}\n[Deadline: ${deadlineDate}${deadlineTime ? ` ${deadlineTime}` : ""}]`;
}
