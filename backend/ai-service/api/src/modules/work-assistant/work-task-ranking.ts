import type { WorkTask } from "./work-assistant.types";

export function rankTasks(tasks: WorkTask[]) {
  const priority: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  return [...tasks].sort(
    (a, b) =>
      Number(b.overdue) - Number(a.overdue) ||
      Number(b.dueToday) - Number(a.dueToday) ||
      Number(!!a.blockedBy.length) - Number(!!b.blockedBy.length) ||
      (priority[b.priority] ?? 0) - (priority[a.priority] ?? 0) ||
      (Date.parse(a.dueAt ?? "") || Infinity) -
        (Date.parse(b.dueAt ?? "") || Infinity) ||
      b.unblocks - a.unblocks ||
      a.id.localeCompare(b.id),
  );
}
