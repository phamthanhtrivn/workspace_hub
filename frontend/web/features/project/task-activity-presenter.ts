import type {
  ProjectMember,
  Task,
  TaskActivity,
} from "./types/project";
import { formatTaskDateTime } from "./utils/task-dates";

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  created: "created this task",
  title: "updated the title",
  description: "updated the description",
  priority: "changed priority to",
  status: "changed status to",
  startDate: "updated start date to",
  dueDate: "updated due date to",
  estimatedMinutes: "updated estimated duration to",
  allDay: "updated all-day setting",
  archived: "archived this task",
  parentTaskId: "changed parent task to",
  assigneeUserId: "assigned task to",
  rank: "reordered task position",
  checklist_created: "added a checklist item",
  checklist_completed: "updated checklist status",
  checklist_deleted: "deleted a checklist item",
  label_attached: "added label",
  label_detached: "removed label",
  comment_created: "commented on task",
  comment_updated: "edited a comment",
  comment_deleted: "deleted a comment",
  "documents.attached": "attached document",
  "documents.detached": "removed document",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function createTaskActivityPresenter(
  members: ProjectMember[],
  tasks: Task[],
) {
  const memberDisplayName = (userId?: string | null) => {
    if (!userId) return "User";
    const name = members.find((member) => member.userId === userId)?.displayName;
    return name && name !== userId ? name : "User";
  };

  const activityActor = (activity: TaskActivity) => {
    const memberName = members.find(
      (member) => member.userId === activity.actorId,
    )?.displayName;
    if (memberName && memberName !== activity.actorId) return memberName;
    if (activity.actorName && activity.actorName !== activity.actorId) {
      return activity.actorName;
    }
    return activity.actorId ? "Member" : "System";
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
          return `${checklist.title || "Checklist item"} (${checklist.completed ? "Done" : "Pending"})`;
        }
        return checklist.title || "Checklist item";
      } catch {
        return value;
      }
    }
    if (activity.field.startsWith("documents.")) {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).join(", ");
        }
      } catch {
        return value;
      }
    }
    if (activity.field === "status")
      return STATUS_LABELS[value] || value;
    if (activity.field === "priority")
      return PRIORITY_LABELS[value] || value;
    if (activity.field === "assigneeUserId") return memberDisplayName(value);
    if (activity.field === "parentTaskId") {
      return tasks.find((task) => task.id === value)?.title || value;
    }
    if (activity.field === "estimatedMinutes")
      return `${value} minutes`;
    if (["startDate", "dueDate"].includes(activity.field)) {
      return formatTaskDateTime(value);
    }
    if (["allDay", "archived"].includes(activity.field)) {
      return value === "true" ? "Enabled" : "Disabled";
    }
    return value;
  };

  return { memberDisplayName, activityActor, activityValue };
}
