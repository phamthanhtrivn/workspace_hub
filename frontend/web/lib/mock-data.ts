import {
  type Project,
  type Task,
  type TaskLabel,
  type ProjectMember,
  type TaskChecklist,
  type TaskComment,
  type TaskActivity,
  type TaskAssignee,
  ProjectStatus,
  ProjectRole,
  TaskStatus,
  TaskPriority,
} from "@/types/project";

// ─── Labels ───────────────────────────────────────────────────────────────────

const labelsProject1: TaskLabel[] = [
  { id: "lbl-1", projectId: "proj-1", name: "Frontend", color: "#6366f1" },
  { id: "lbl-2", projectId: "proj-1", name: "Backend", color: "#f59e0b" },
  { id: "lbl-3", projectId: "proj-1", name: "Bug", color: "#ef4444" },
  { id: "lbl-4", projectId: "proj-1", name: "Design", color: "#ec4899" },
  { id: "lbl-5", projectId: "proj-1", name: "Documentation", color: "#8b5cf6" },
];

const labelsProject2: TaskLabel[] = [
  { id: "lbl-6", projectId: "proj-2", name: "Research", color: "#14b8a6" },
  { id: "lbl-7", projectId: "proj-2", name: "Writing", color: "#f97316" },
  { id: "lbl-8", projectId: "proj-2", name: "Review", color: "#6366f1" },
];

const labelsProject3: TaskLabel[] = [
  { id: "lbl-9", projectId: "proj-3", name: "Planning", color: "#0ea5e9" },
  { id: "lbl-10", projectId: "proj-3", name: "Execution", color: "#22c55e" },
  { id: "lbl-11", projectId: "proj-3", name: "Urgent", color: "#ef4444" },
];

// ─── Members ──────────────────────────────────────────────────────────────────

const membersProject1: ProjectMember[] = [
  { id: "mem-1", projectId: "proj-1", userId: "u-1", displayName: "Thanh Trí", role: ProjectRole.OWNER, joinedAt: "2026-05-01T08:00:00Z" },
  { id: "mem-2", projectId: "proj-1", userId: "u-2", displayName: "Minh Anh", role: ProjectRole.ADMIN, joinedAt: "2026-05-02T09:00:00Z" },
  { id: "mem-3", projectId: "proj-1", userId: "u-3", displayName: "Hoàng Nam", role: ProjectRole.MEMBER, joinedAt: "2026-05-03T10:00:00Z" },
  { id: "mem-4", projectId: "proj-1", userId: "u-4", displayName: "Thu Hà", role: ProjectRole.MEMBER, joinedAt: "2026-05-05T11:00:00Z" },
];

const membersProject2: ProjectMember[] = [
  { id: "mem-5", projectId: "proj-2", userId: "u-1", displayName: "Thanh Trí", role: ProjectRole.OWNER, joinedAt: "2026-06-01T08:00:00Z" },
  { id: "mem-6", projectId: "proj-2", userId: "u-5", displayName: "Quốc Bảo", role: ProjectRole.MEMBER, joinedAt: "2026-06-02T09:00:00Z" },
];

const membersProject3: ProjectMember[] = [
  { id: "mem-7", projectId: "proj-3", userId: "u-1", displayName: "Thanh Trí", role: ProjectRole.OWNER, joinedAt: "2026-04-15T08:00:00Z" },
  { id: "mem-8", projectId: "proj-3", userId: "u-2", displayName: "Minh Anh", role: ProjectRole.MEMBER, joinedAt: "2026-04-16T09:00:00Z" },
  { id: "mem-9", projectId: "proj-3", userId: "u-6", displayName: "Lan Phương", role: ProjectRole.ADMIN, joinedAt: "2026-04-17T10:00:00Z" },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildTask(overrides: Partial<Task> & { id: string; projectId: string; title: string; status: TaskStatus; priority: TaskPriority }): Task {
  return {
    description: "",
    createdBy: "u-1",
    reporterId: "u-1",
    allDay: false,
    estimatedMinutes: 0,
    rank: "0",
    archived: false,
    createdAt: "2026-06-10T08:00:00Z",
    updatedAt: "2026-06-20T12:00:00Z",
    checklists: [],
    assignees: [],
    comments: [],
    activities: [],
    timeTrackings: [],
    labels: [],
    pomodoroSessions: [],
    ...overrides,
  };
}

// ─── Tasks for Project 1 ─────────────────────────────────────────────────────

const tasksProject1: Task[] = [
  buildTask({
    id: "t-1", projectId: "proj-1", title: "Thiết kế UI trang Dashboard", status: TaskStatus.DONE, priority: TaskPriority.HIGH,
    description: "Xây dựng giao diện trang Dashboard với các widget thống kê, biểu đồ tiến độ, và danh sách công việc gần đây.",
    dueDate: "2026-06-15T17:00:00Z", estimatedMinutes: 480, completedAt: "2026-06-14T16:30:00Z", rank: "a",
    labels: [labelsProject1[0], labelsProject1[3]],
    assignees: [
      { id: "ta-1", taskId: "t-1", userId: "u-1", displayName: "Thanh Trí", assignedAt: "2026-06-10T08:00:00Z" },
    ],
    checklists: [
      { id: "cl-1", taskId: "t-1", title: "Wireframe trên Figma", completed: true, createdAt: "2026-06-10T08:00:00Z", rank: "a" },
      { id: "cl-2", taskId: "t-1", title: "Implement layout responsive", completed: true, createdAt: "2026-06-10T08:00:00Z", rank: "b" },
      { id: "cl-3", taskId: "t-1", title: "Kết nối API thống kê", completed: true, createdAt: "2026-06-11T09:00:00Z", rank: "c" },
    ],
    comments: [
      { id: "cmt-1", taskId: "t-1", authorId: "u-2", authorName: "Minh Anh", content: "Thiết kế rất đẹp, approve! 🎉", edited: false, createdAt: "2026-06-14T15:00:00Z", updatedAt: "2026-06-14T15:00:00Z" },
    ],
    activities: [
      { id: "act-1", taskId: "t-1", actorId: "u-1", actorName: "Thanh Trí", field: "status", oldValue: "IN_REVIEW", newValue: "DONE", createdAt: "2026-06-14T16:30:00Z" },
    ],
  }),
  buildTask({
    id: "t-2", projectId: "proj-1", title: "Xây dựng API quản lý tài liệu", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.URGENT,
    description: "Implement REST API cho upload, download, preview và chia sẻ tài liệu. Hỗ trợ PDF, DOCX, PPTX.",
    dueDate: "2026-06-28T17:00:00Z", estimatedMinutes: 960, rank: "b",
    labels: [labelsProject1[1]],
    assignees: [
      { id: "ta-2", taskId: "t-2", userId: "u-3", displayName: "Hoàng Nam", assignedAt: "2026-06-12T08:00:00Z" },
      { id: "ta-3", taskId: "t-2", userId: "u-2", displayName: "Minh Anh", assignedAt: "2026-06-12T08:00:00Z" },
    ],
    checklists: [
      { id: "cl-4", taskId: "t-2", title: "Design database schema", completed: true, createdAt: "2026-06-12T08:00:00Z", rank: "a" },
      { id: "cl-5", taskId: "t-2", title: "Upload endpoint + MinIO integration", completed: true, createdAt: "2026-06-12T08:00:00Z", rank: "b" },
      { id: "cl-6", taskId: "t-2", title: "Download & preview endpoint", completed: false, createdAt: "2026-06-13T09:00:00Z", rank: "c" },
      { id: "cl-7", taskId: "t-2", title: "Share & permission API", completed: false, createdAt: "2026-06-13T09:00:00Z", rank: "d" },
    ],
    comments: [
      { id: "cmt-2", taskId: "t-2", authorId: "u-3", authorName: "Hoàng Nam", content: "Đã setup MinIO trên Docker, đang viết upload service.", edited: false, createdAt: "2026-06-18T10:00:00Z", updatedAt: "2026-06-18T10:00:00Z" },
      { id: "cmt-3", taskId: "t-2", authorId: "u-1", authorName: "Thanh Trí", content: "Nhớ xử lý file size limit là 50MB nhé @Hoàng Nam", edited: false, createdAt: "2026-06-18T11:00:00Z", updatedAt: "2026-06-18T11:00:00Z" },
    ],
    activities: [
      { id: "act-2", taskId: "t-2", actorId: "u-3", actorName: "Hoàng Nam", field: "status", oldValue: "TODO", newValue: "IN_PROGRESS", createdAt: "2026-06-15T08:00:00Z" },
    ],
  }),
  buildTask({
    id: "t-3", projectId: "proj-1", title: "Fix lỗi đăng nhập OAuth2 Google", status: TaskStatus.IN_REVIEW, priority: TaskPriority.HIGH,
    description: "Người dùng không thể đăng nhập bằng Google trên trình duyệt Safari. Cần kiểm tra lại redirect URI và session handling.",
    dueDate: "2026-06-25T17:00:00Z", estimatedMinutes: 180, rank: "c",
    labels: [labelsProject1[1], labelsProject1[2]],
    assignees: [
      { id: "ta-4", taskId: "t-3", userId: "u-4", displayName: "Thu Hà", assignedAt: "2026-06-16T08:00:00Z" },
    ],
    checklists: [
      { id: "cl-8", taskId: "t-3", title: "Reproduce bug trên Safari", completed: true, createdAt: "2026-06-16T08:00:00Z", rank: "a" },
      { id: "cl-9", taskId: "t-3", title: "Fix redirect URI config", completed: true, createdAt: "2026-06-16T08:00:00Z", rank: "b" },
      { id: "cl-10", taskId: "t-3", title: "Test lại trên các trình duyệt", completed: true, createdAt: "2026-06-17T09:00:00Z", rank: "c" },
    ],
    activities: [
      { id: "act-3", taskId: "t-3", actorId: "u-4", actorName: "Thu Hà", field: "status", oldValue: "IN_PROGRESS", newValue: "IN_REVIEW", createdAt: "2026-06-22T14:00:00Z" },
    ],
  }),
  buildTask({
    id: "t-4", projectId: "proj-1", title: "Tích hợp AI tóm tắt tài liệu", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM,
    description: "Kết nối Document Service với AI Service để tự động tóm tắt nội dung khi người dùng upload tài liệu mới.",
    dueDate: "2026-07-10T17:00:00Z", estimatedMinutes: 720, rank: "d",
    labels: [labelsProject1[1], labelsProject1[0]],
    assignees: [
      { id: "ta-5", taskId: "t-4", userId: "u-1", displayName: "Thanh Trí", assignedAt: "2026-06-20T08:00:00Z" },
    ],
  }),
  buildTask({
    id: "t-5", projectId: "proj-1", title: "Viết unit test cho Auth Service", status: TaskStatus.TODO, priority: TaskPriority.LOW,
    description: "Viết unit test cho các endpoint authentication: login, register, refresh token, logout.",
    dueDate: "2026-07-15T17:00:00Z", estimatedMinutes: 360, rank: "e",
    labels: [labelsProject1[1], labelsProject1[4]],
    assignees: [
      { id: "ta-6", taskId: "t-5", userId: "u-2", displayName: "Minh Anh", assignedAt: "2026-06-20T08:00:00Z" },
    ],
  }),
  buildTask({
    id: "t-6", projectId: "proj-1", title: "Thiết kế giao diện Kanban Board", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH,
    description: "Xây dựng giao diện Kanban Board cho module quản lý dự án với drag-and-drop.",
    dueDate: "2026-06-30T17:00:00Z", estimatedMinutes: 600, rank: "f",
    labels: [labelsProject1[0], labelsProject1[3]],
    assignees: [
      { id: "ta-7", taskId: "t-6", userId: "u-1", displayName: "Thanh Trí", assignedAt: "2026-06-22T08:00:00Z" },
      { id: "ta-8", taskId: "t-6", userId: "u-4", displayName: "Thu Hà", assignedAt: "2026-06-22T08:00:00Z" },
    ],
    checklists: [
      { id: "cl-11", taskId: "t-6", title: "Layout 4 cột trạng thái", completed: true, createdAt: "2026-06-22T08:00:00Z", rank: "a" },
      { id: "cl-12", taskId: "t-6", title: "Task card component", completed: false, createdAt: "2026-06-22T08:00:00Z", rank: "b" },
      { id: "cl-13", taskId: "t-6", title: "Drag & drop interaction", completed: false, createdAt: "2026-06-22T08:00:00Z", rank: "c" },
    ],
  }),
  buildTask({
    id: "t-7", projectId: "proj-1", title: "Setup CI/CD pipeline", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM,
    description: "Cấu hình GitHub Actions cho build, test và deploy tự động lên staging server.",
    estimatedMinutes: 240, completedAt: "2026-06-08T15:00:00Z", rank: "g",
    labels: [labelsProject1[1]],
    assignees: [
      { id: "ta-9", taskId: "t-7", userId: "u-3", displayName: "Hoàng Nam", assignedAt: "2026-06-05T08:00:00Z" },
    ],
  }),
  buildTask({
    id: "t-8", projectId: "proj-1", title: "Tạo component Calendar View", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM,
    description: "Xây dựng giao diện lịch hiển thị các task theo ngày/tuần/tháng với due date.",
    dueDate: "2026-07-20T17:00:00Z", estimatedMinutes: 480, rank: "h",
    labels: [labelsProject1[0]],
    assignees: [],
  }),
];

// ─── Tasks for Project 2 ─────────────────────────────────────────────────────

const tasksProject2: Task[] = [
  buildTask({
    id: "t-9", projectId: "proj-2", title: "Thu thập tài liệu chương 1-3", status: TaskStatus.DONE, priority: TaskPriority.HIGH,
    dueDate: "2026-06-20T17:00:00Z", estimatedMinutes: 300, completedAt: "2026-06-19T10:00:00Z", rank: "a",
    labels: [labelsProject2[0]],
    assignees: [{ id: "ta-10", taskId: "t-9", userId: "u-1", displayName: "Thanh Trí", assignedAt: "2026-06-10T08:00:00Z" }],
  }),
  buildTask({
    id: "t-10", projectId: "proj-2", title: "Viết nội dung chương 4: Phân tích thiết kế", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.URGENT,
    dueDate: "2026-06-30T17:00:00Z", estimatedMinutes: 600, rank: "b",
    labels: [labelsProject2[1]],
    assignees: [{ id: "ta-11", taskId: "t-10", userId: "u-1", displayName: "Thanh Trí", assignedAt: "2026-06-20T08:00:00Z" }],
    checklists: [
      { id: "cl-14", taskId: "t-10", title: "Sơ đồ Use Case", completed: true, createdAt: "2026-06-20T08:00:00Z", rank: "a" },
      { id: "cl-15", taskId: "t-10", title: "Sơ đồ ERD", completed: true, createdAt: "2026-06-20T08:00:00Z", rank: "b" },
      { id: "cl-16", taskId: "t-10", title: "Sơ đồ Sequence", completed: false, createdAt: "2026-06-21T09:00:00Z", rank: "c" },
    ],
  }),
  buildTask({
    id: "t-11", projectId: "proj-2", title: "Review và chỉnh sửa chương 1-2", status: TaskStatus.TODO, priority: TaskPriority.MEDIUM,
    dueDate: "2026-07-05T17:00:00Z", estimatedMinutes: 180, rank: "c",
    labels: [labelsProject2[2]],
    assignees: [{ id: "ta-12", taskId: "t-11", userId: "u-5", displayName: "Quốc Bảo", assignedAt: "2026-06-22T08:00:00Z" }],
  }),
];

// ─── Tasks for Project 3 ─────────────────────────────────────────────────────

const tasksProject3: Task[] = [
  buildTask({
    id: "t-12", projectId: "proj-3", title: "Lên kế hoạch sprint 1", status: TaskStatus.DONE, priority: TaskPriority.HIGH,
    estimatedMinutes: 120, completedAt: "2026-05-01T12:00:00Z", rank: "a",
    labels: [labelsProject3[0]],
    assignees: [{ id: "ta-13", taskId: "t-12", userId: "u-6", displayName: "Lan Phương", assignedAt: "2026-04-20T08:00:00Z" }],
  }),
  buildTask({
    id: "t-13", projectId: "proj-3", title: "Tổ chức meeting kick-off", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM,
    estimatedMinutes: 60, completedAt: "2026-05-02T10:00:00Z", rank: "b",
    labels: [labelsProject3[0]],
    assignees: [
      { id: "ta-14", taskId: "t-13", userId: "u-1", displayName: "Thanh Trí", assignedAt: "2026-04-25T08:00:00Z" },
      { id: "ta-15", taskId: "t-13", userId: "u-6", displayName: "Lan Phương", assignedAt: "2026-04-25T08:00:00Z" },
    ],
  }),
];

// ─── Projects ─────────────────────────────────────────────────────────────────

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "WorkspaceHub Platform",
    color: "#6366f1",
    icon: "🚀",
    ownerId: "u-1",
    status: ProjectStatus.ACTIVE,
    archived: false,
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-06-27T12:00:00Z",
    projectSetting: {
      id: "ps-1", projectId: "proj-1",
      allowMemberCreateTask: true,
      allowMemberEditOthersTask: false,
      allowMemberEditOwnTask: true,
      allowMemberInvite: false,
    },
    members: membersProject1,
    tasks: tasksProject1,
    labels: labelsProject1,
  },
  {
    id: "proj-2",
    name: "Khóa luận tốt nghiệp",
    color: "#f59e0b",
    icon: "📚",
    ownerId: "u-1",
    status: ProjectStatus.ACTIVE,
    archived: false,
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-27T10:00:00Z",
    projectSetting: {
      id: "ps-2", projectId: "proj-2",
      allowMemberCreateTask: true,
      allowMemberEditOthersTask: true,
      allowMemberEditOwnTask: true,
      allowMemberInvite: true,
    },
    members: membersProject2,
    tasks: tasksProject2,
    labels: labelsProject2,
  },
  {
    id: "proj-3",
    name: "Marketing Campaign Q3",
    color: "#22c55e",
    icon: "📊",
    ownerId: "u-1",
    status: ProjectStatus.COMPLETED,
    archived: false,
    createdAt: "2026-04-15T08:00:00Z",
    updatedAt: "2026-06-20T10:00:00Z",
    projectSetting: {
      id: "ps-3", projectId: "proj-3",
      allowMemberCreateTask: true,
      allowMemberEditOthersTask: false,
      allowMemberEditOwnTask: true,
      allowMemberInvite: false,
    },
    members: membersProject3,
    tasks: tasksProject3,
    labels: labelsProject3,
  },
];

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}

export function getTasksByStatus(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((t) => t.status === status && !t.archived);
}
