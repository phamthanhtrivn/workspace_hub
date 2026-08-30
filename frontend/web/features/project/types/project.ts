// ─── Enums ────────────────────────────────────────────────────────────────────

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum ProjectType {
  GENERAL = "GENERAL",
  SOFTWARE_DEVELOPMENT = "SOFTWARE_DEVELOPMENT",
}

export enum ProjectTemplate {
  EMPTY = "EMPTY",
  SOFTWARE_SCRUM = "SOFTWARE_SCRUM",
  MARKETING_CAMPAIGN = "MARKETING_CAMPAIGN",
  EVENT_PLAN = "EVENT_PLAN",
}

export enum SprintStatus {
  PLANNED = "PLANNED",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
}

export enum ProjectRole {
  OWNER = "OWNER",
  MEMBER = "MEMBER",
}

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
  CANCELLED = "CANCELLED",
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === TaskStatus.DONE || status === TaskStatus.CANCELLED;
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
  canCreateTask: boolean;
  canEditOwnTask: boolean;
  canEditOthersTask: boolean;
  canManageSprints: boolean;
  canManageMembers: boolean;
  canManageLabels: boolean;
  joinedAt: string;
}

export type ProjectMemberPermissions = Pick<
  ProjectMember,
  | "canCreateTask"
  | "canEditOwnTask"
  | "canEditOthersTask"
  | "canManageSprints"
  | "canManageMembers"
  | "canManageLabels"
>;

export interface TaskLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

export interface TaskDependency {
  id: string;
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: string;
  createdBy: string;
  createdAt: string;
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
  actorId?: string | null;
  actorName?: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export enum TaskType {
  TASK = "TASK",
  BUG = "BUG",
  STORY = "STORY",
  EPIC = "EPIC",
  SUBTASK = "SUBTASK",
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
  taskNumber: number;
  taskType: TaskType;
  parentTaskId?: string;
  childCount?: number;
  isParentTask?: boolean;
  autoCompleteSprint?: boolean;
  sprintId?: string;
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
  description?: string;
  ownerId: string;
  status: ProjectStatus;
  projectType: ProjectType;
  startDate?: string;
  dueDate?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  totalTaskCount: number;
  completedTaskCount: number;

  // Relations (populated)
  projectSetting: ProjectSetting;
  members: ProjectMember[];
  tasks: Task[];
  labels: TaskLabel[];
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  startedAt?: string;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
}
