import { Temporal } from "temporal-polyfill";
import {
  getAllCalendarTasks,
  getCalendars,
  listCalendarPomodoroSessions,
} from "@/features/calendar/api/calendar.api";
import type { CalendarPomodoroSession } from "@/features/calendar/types/calendar.types";
import { readTaskDeadline } from "@/features/calendar/utils/calendar-task-deadline.utils";
import { fetchAllPages } from "@/features/project/api/pagination";
import { getProjects } from "@/features/project/api/project.api";
import { getProjectTasks } from "@/features/project/api/task.api";
import {
  ProjectStatus,
  isTerminalTaskStatus,
} from "@/features/project/types/project";
import type { DashboardTask } from "../types/dashboard.types";
import { getUpcomingMeetings } from "@/features/meeting/api/meeting.api";
import type { UpcomingMeetingItem } from "@/features/meeting/types/meeting.types";

export async function getPersonalDashboardTasks(
  userId: string,
): Promise<DashboardTask[]> {
  const [events, calendars] = await Promise.all([
    getAllCalendarTasks(),
    getCalendars(),
  ]);
  const byId = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  return events.flatMap((item) => {
    const event = {
      ...item,
      calendar: item.calendar ?? byId.get(item.calendarId),
    };
    if (
      !event.calendar ||
      event.calendar.projectId ||
      event.calendar.ownerUserId !== userId ||
      event.completedAt ||
      event.cancelledAt ||
      event.status === "CANCELLED"
    )
      return [];
    const deadline = readTaskDeadline(event.description);
    let dueAt: string | null = deadline.date || null;
    if (deadline.date && deadline.time) {
      dueAt = Temporal.PlainDateTime.from(`${deadline.date}T${deadline.time}`)
        .toZonedDateTime(event.timeZone || "UTC")
        .toInstant()
        .toString();
    }
    return [
      {
        key: `calendar:${event.id}`,
        source: "calendar" as const,
        sourceId: event.id,
        title: event.title,
        href: `/calendar?event=${encodeURIComponent(event.id)}`,
        projectName: "Personal task",
        dueAt,
        dateOnly: !deadline.time,
        priority: "MEDIUM",
      },
    ];
  });
}

export async function getProjectDashboardTasks(
  userId: string,
): Promise<DashboardTask[]> {
  const projects = await fetchAllPages(async (page, limit) => {
    const result = await getProjects({
      page,
      limit,
      status: ProjectStatus.ACTIVE,
      hasAssignedTasks: true,
    });
    return { items: result.data, meta: result.meta };
  });
  const groups: DashboardTask[][] = [];
  // Bound concurrency so users with many projects do not flood the gateway.
  for (let index = 0; index < projects.length; index += 4) {
    groups.push(
      ...(await Promise.all(
        projects
          .slice(index, index + 4)
          .filter((project) => !project.archived)
          .map(async (project) => {
            const tasks = await getProjectTasks(project.id, { onlyMine: true });
            return tasks
              .filter(
                (task) =>
                  !task.archived &&
                  !task.deletedAt &&
                  !task.completedAt &&
                  !isTerminalTaskStatus(task.status) &&
                  task.assignees.some((assignee) => assignee.userId === userId),
              )
              .map((task) => ({
                key: `project:${task.id}`,
                source: "project" as const,
                sourceId: task.id,
                title: task.title,
                href: `/projects/${encodeURIComponent(project.id)}?taskId=${encodeURIComponent(task.id)}`,
                projectName: project.name,
                dueAt: task.dueDate || null,
                dateOnly:
                  task.allDay || /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || ""),
                priority: task.priority,
              }));
          }),
      )),
    );
  }
  return groups.flat();
}

export async function getDashboardFocusSessions(
  startAt: string,
  endAt: string,
  signal?: AbortSignal,
) {
  const sessions = new Map<string, CalendarPomodoroSession>();
  let page = 1;
  let totalPages = 1;
  do {
    const result = await listCalendarPomodoroSessions(
      { startAt, endAt, page, limit: 1000 },
      signal,
    );
    for (const session of result.sessions) sessions.set(session.id, session);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages);
  return [...sessions.values()];
}

export async function getDashboardDayMeetings(endAt: string) {
  const meetings: UpcomingMeetingItem[] = [];
  let page = 1;
  while (true) {
    const { data } = await getUpcomingMeetings({ page, limit: 50 });
    meetings.push(...data.items);
    // Upcoming meetings are ordered by scheduled start on the server.
    const last = data.items.at(-1);
    if (
      page >= data.totalPages ||
      !last ||
      (last.scheduledStartAt &&
        Date.parse(last.scheduledStartAt) >= Date.parse(endAt))
    )
      return meetings;
    page += 1;
  }
}
