import type { WorkspaceCalendar } from "@/features/calendar/types/calendar.types";

export function getPersonalTaskCalendar(calendars: WorkspaceCalendar[], userId: string | null | undefined) {
  const personalCalendars = calendars.filter((calendar) => !calendar.projectId && calendar.ownerUserId === userId);
  return personalCalendars.find((calendar) => calendar.isDefault) ?? personalCalendars[0];
}
