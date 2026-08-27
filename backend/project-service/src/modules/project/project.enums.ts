export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum ProjectType {
  GENERAL = 'GENERAL',
  SOFTWARE_DEVELOPMENT = 'SOFTWARE_DEVELOPMENT',
}

export enum ProjectTemplate {
  EMPTY = 'EMPTY',
  SOFTWARE_SCRUM = 'SOFTWARE_SCRUM',
  MARKETING_CAMPAIGN = 'MARKETING_CAMPAIGN',
  EVENT_PLAN = 'EVENT_PLAN',
}

export enum ProjectVisibility {
  PRIVATE = 'PRIVATE',
  MEMBERS_ONLY = 'MEMBERS_ONLY',
  PUBLIC = 'PUBLIC',
}

export enum ProjectRole {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER',
}

export enum ProjectMemberStatus {
  ACTIVE = 'ACTIVE',
  LEFT = 'LEFT',
  REMOVED = 'REMOVED',
}

export enum SprintStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

export function isTerminalTaskStatus(status: string): boolean {
  return status === TaskStatus.DONE || status === TaskStatus.CANCELLED;
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskType {
  TASK = 'TASK',
  BUG = 'BUG',
  STORY = 'STORY',
  EPIC = 'EPIC',
  SUBTASK = 'SUBTASK',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}
