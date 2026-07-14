// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum ProjectRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum SessionType {
  FOCUS = "FOCUS",
  SHORT_BREAK = "SHORT_BREAK",
  LONG_BREAK = "LONG_BREAK",
}

export enum SessionStatus {
  COMPLETED = "COMPLETED",
  STOPPED = "STOPPED",
  CANCELED = "CANCELED",
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ProjectSetting {
  id: string;
  projectId: string;
  allowMemberCreateTask: boolean;
  allowMemberEditOthersTask: boolean;
  allowMemberEditOwnTask: boolean;
  allowMemberInvite: boolean;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface TaskLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface TaskChecklist {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  createdAt: string;
  rank: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string;
  actorName: string;
  field: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  assignedAt: string;
}

export interface TimeTracking {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  endedAt: string;
}

export interface PomodoroSession {
  id: string;
  taskId?: string;
  userId: string;
  sessionType: SessionType;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string;
  reporterId: string;
  startDate?: string;
  dueDate?: string;
  allDay: boolean;
  completedAt?: string;
  estimatedMinutes: number;
  rank: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations (populated)
  checklists: TaskChecklist[];
  assignees: TaskAssignee[];
  comments: TaskComment[];
  activities: TaskActivity[];
  timeTrackings: TimeTracking[];
  labels: TaskLabel[];
  pomodoroSessions: PomodoroSession[];
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  ownerId: string;
  status: ProjectStatus;
  archived: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations (populated)
  projectSetting: ProjectSetting;
  members: ProjectMember[];
  tasks: Task[];
  labels: TaskLabel[];
}
