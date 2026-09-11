import type {
  ProjectMember,
  Task,
  TaskActivity,
} from "./types/project";

export const ACTIVITY_ACTION_LABEL_IDS: Record<string, string> = {
  created: "project.activity.action.created",
  title: "project.activity.action.title",
  description: "project.activity.action.description",
  priority: "project.activity.action.priority",
  status: "project.activity.action.status",
  taskType: "project.activity.action.taskType",
  startDate: "project.activity.action.startDate",
  dueDate: "project.activity.action.dueDate",
  estimatedMinutes: "project.activity.action.estimatedMinutes",
  allDay: "project.activity.action.allDay",
  archived: "project.activity.action.archived",
  parentTaskId: "project.activity.action.parentTaskId",
  assigneeUserId: "project.activity.action.assigneeUserId",
  isParentTask: "project.activity.action.isParentTask",
  autoCompleteSprint: "project.activity.action.autoCompleteSprint",
  rank: "project.activity.action.rank",
  checklist_created: "project.activity.action.checklistCreated",
  checklist_completed: "project.activity.action.checklistCompleted",
  checklist_deleted: "project.activity.action.checklistDeleted",
  label_attached: "project.activity.action.labelAttached",
  label_detached: "project.activity.action.labelDetached",
  comment_created: "project.activity.action.commentCreated",
  comment_updated: "project.activity.action.commentUpdated",
  comment_deleted: "project.activity.action.commentDeleted",
};

const STATUS_LABEL_IDS: Record<string, string> = {
  TODO: "project.task.status.todo",
  IN_PROGRESS: "project.task.status.inProgress",
  IN_REVIEW: "project.task.status.inReview",
  DONE: "project.task.status.done",
  CANCELLED: "project.task.status.cancelled",
};

const PRIORITY_LABEL_IDS: Record<string, string> = {
  LOW: "project.task.priority.low",
  MEDIUM: "project.task.priority.medium",
  HIGH: "project.task.priority.high",
  URGENT: "project.task.priority.urgent",
};

const TASK_TYPE_LABEL_IDS: Record<string, string> = {
  TASK: "project.task.type.task",
  BUG: "project.task.type.bug",
  STORY: "project.task.type.story",
  EPIC: "project.task.type.epic",
  SUBTASK: "project.task.type.subtask",
};

export function createTaskActivityPresenter(
  members: ProjectMember[],
  tasks: Task[],
  formatMessage: (id: string, values?: Record<string, string | number>) => string,
  formatDate: (value: Date) => string,
) {
  const memberDisplayName = (userId?: string | null) => {
    if (!userId) return formatMessage("app.user");
    const name = members.find((member) => member.userId === userId)?.displayName;
    return name && name !== userId ? name : formatMessage("app.user");
  };

  const activityActor = (activity: TaskActivity) => {
    const memberName = members.find(
      (member) => member.userId === activity.actorId,
    )?.displayName;
    if (memberName && memberName !== activity.actorId) return memberName;
    if (activity.actorName && activity.actorName !== activity.actorId) {
      return activity.actorName;
    }
    return formatMessage(activity.actorId ? "project.role.member" : "app.system");
  };

  const activityValue = (activity: TaskActivity, value?: string | null) => {
    if (value === undefined || value === null || value === "") return null;
    if (activity.field.startsWith("checklist_")) {
      try {
        const checklist = JSON.parse(value) as {
          title?: string;
          completed?: boolean;
        };
        if (typeof checklist.completed === "boolean") {
          return formatMessage(
            "project.activity.checklistValue",
            {
              title: checklist.title || formatMessage("project.checklist.title"),
              state: formatMessage(
                checklist.completed
                  ? "project.task.status.done"
                  : "project.checklist.incomplete",
              ),
            },
          );
        }
        return checklist.title || formatMessage("project.checklist.title");
      } catch {
        return value;
      }
    }
    if (activity.field === "status")
      return STATUS_LABEL_IDS[value] ? formatMessage(STATUS_LABEL_IDS[value]) : value;
    if (activity.field === "priority")
      return PRIORITY_LABEL_IDS[value] ? formatMessage(PRIORITY_LABEL_IDS[value]) : value;
    if (activity.field === "taskType")
      return TASK_TYPE_LABEL_IDS[value] ? formatMessage(TASK_TYPE_LABEL_IDS[value]) : value;
    if (activity.field === "assigneeUserId") return memberDisplayName(value);
    if (activity.field === "parentTaskId") {
      return tasks.find((task) => task.id === value)?.title || value;
    }
    if (activity.field === "estimatedMinutes")
      return formatMessage("project.task.minutes", { count: value });
    if (["startDate", "dueDate"].includes(activity.field)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : formatDate(date);
    }
    if (["allDay", "archived", "isParentTask", "autoCompleteSprint"].includes(activity.field)) {
      return formatMessage(value === "true" ? "app.enabled" : "app.disabled");
    }
    return value;
  };

  return { memberDisplayName, activityActor, activityValue };
}
