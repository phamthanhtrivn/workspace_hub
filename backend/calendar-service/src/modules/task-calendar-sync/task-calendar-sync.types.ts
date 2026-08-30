export interface ProjectTaskCalendarPayload {
  eventType: 'PROJECT_TASK_CALENDAR_UPSERTED' | 'PROJECT_TASK_CALENDAR_REMOVED';
  occurredAt: string;
  task: {
    id: string;
    projectId: string;
    projectName: string;
    projectColor?: string | null;
    title: string;
    description?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    allDay: boolean;
    createdBy: string;
    recipientUserIds: string[];
  };
}
