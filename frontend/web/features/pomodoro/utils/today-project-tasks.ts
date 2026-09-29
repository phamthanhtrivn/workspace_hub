import { getProjects } from "@/features/project/api/project.api";
import { getProjectTasks } from "@/features/project/api/task.api";
import { fetchAllPages } from "@/features/project/api/pagination";
import { isTerminalTaskStatus, type Project, type Task } from "@/features/project/types/project";
import { taskDateKey } from "@/features/project/utils/task-dates";

const PROJECT_PAGE_SIZE = 10;

export interface PomodoroProjectTask {
  task: Task;
  project: Project;
}

function overlapsToday(task: Task, now: Date): boolean {
  if (!task.startDate || !task.dueDate) return false;
  const start = new Date(task.startDate).getTime();
  const end = new Date(task.dueDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return false;

  if (task.allDay) {
    const today = taskDateKey(now.toISOString());
    return taskDateKey(task.startDate, true) <= today && taskDateKey(task.dueDate, true) >= today;
  }

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  return start < dayEnd.getTime() &&
    (end > dayStart.getTime() || (start === end && start === dayStart.getTime()));
}

export async function getTodayProjectTasks(userId: string): Promise<PomodoroProjectTask[]> {
  if (!userId) return [];
  const now = new Date();
  const projects = await fetchAllPages(async (page, limit) => {
    const result = await getProjects({ page, limit });
    return { items: result.data, meta: result.meta };
  }, PROJECT_PAGE_SIZE);
  const groups = await Promise.all(projects.map(async (project) => {
    const tasks = await getProjectTasks(project.id, { onlyMine: true });
    return tasks
      .filter((task) =>
        task.projectId === project.id &&
        task.assignees.some((assignee) => assignee.userId === userId) &&
        !task.archived && !task.completedAt && !isTerminalTaskStatus(task.status) &&
        overlapsToday(task, now),
      )
      .map((task) => ({ task, project }));
  }));
  return groups.flat().sort((first, second) =>
    Date.parse(first.task.startDate!) - Date.parse(second.task.startDate!) ||
    first.task.title.localeCompare(second.task.title),
  );
}
