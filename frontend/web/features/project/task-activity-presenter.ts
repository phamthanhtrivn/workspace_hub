import type {
  ProjectMember,
  Task,
  TaskActivity,
} from "./types/project";

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  created: "Đã tạo công việc",
  title: "Đã đổi tên công việc",
  description: "Đã cập nhật mô tả",
  priority: "Đã thay đổi độ ưu tiên",
  status: "Đã thay đổi trạng thái",
  taskType: "Đã thay đổi loại công việc",
  startDate: "Đã thay đổi ngày bắt đầu",
  dueDate: "Đã thay đổi hạn hoàn thành",
  estimatedMinutes: "Đã thay đổi thời gian ước tính",
  allDay: "Đã thay đổi chế độ cả ngày",
  archived: "Đã thay đổi trạng thái lưu trữ",
  parentTaskId: "Đã thay đổi task cha",
  assigneeUserId: "Đã thay đổi người thực hiện",
  isParentTask: "Đã thay đổi loại task",
  autoCompleteSprint: "Đã thay đổi tự động hoàn thành sprint",
  rank: "Đã thay đổi thứ tự",
  checklist_created: "Đã thêm mục checklist",
  checklist_completed: "Đã cập nhật mục checklist",
  checklist_deleted: "Đã xóa mục checklist",
  label_attached: "Đã gắn nhãn",
  label_detached: "Đã gỡ nhãn",
  comment_created: "Đã thêm bình luận",
  comment_updated: "Đã chỉnh sửa bình luận",
  comment_deleted: "Đã xóa bình luận",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  IN_REVIEW: "Đang review",
  DONE: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  TASK: "Task",
  BUG: "Bug",
  STORY: "Story",
  EPIC: "Epic",
  SUBTASK: "Subtask",
};

export function createTaskActivityPresenter(
  members: ProjectMember[],
  tasks: Task[],
) {
  const memberDisplayName = (userId?: string | null) => {
    if (!userId) return "Người dùng";
    const name = members.find((member) => member.userId === userId)?.displayName;
    return name && name !== userId ? name : "Người dùng";
  };

  const activityActor = (activity: TaskActivity) => {
    const memberName = memberDisplayName(activity.actorId);
    if (memberName !== "Người dùng") return memberName;
    if (activity.actorName && activity.actorName !== activity.actorId) {
      return activity.actorName;
    }
    return activity.actorId ? "Thành viên" : "Hệ thống";
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
          return `${checklist.title || "Checklist"}: ${checklist.completed ? "Đã hoàn thành" : "Chưa hoàn thành"}`;
        }
        return checklist.title || "Checklist";
      } catch {
        return value;
      }
    }
    if (activity.field === "status") return STATUS_LABELS[value] || value;
    if (activity.field === "priority") return PRIORITY_LABELS[value] || value;
    if (activity.field === "taskType") return TASK_TYPE_LABELS[value] || value;
    if (activity.field === "assigneeUserId") return memberDisplayName(value);
    if (activity.field === "parentTaskId") {
      return tasks.find((task) => task.id === value)?.title || value;
    }
    if (activity.field === "estimatedMinutes") return `${value} phút`;
    if (["startDate", "dueDate"].includes(activity.field)) {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString("vi-VN");
    }
    if (["allDay", "archived", "isParentTask", "autoCompleteSprint"].includes(activity.field)) {
      return value === "true" ? "Bật" : "Tắt";
    }
    return value;
  };

  return { memberDisplayName, activityActor, activityValue };
}
