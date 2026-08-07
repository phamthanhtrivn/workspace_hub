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

export enum ProjectFilter {
  ALL = "ALL",
  ACTIVE = ProjectStatus.ACTIVE,
  ON_HOLD = ProjectStatus.ON_HOLD,
  COMPLETED = ProjectStatus.COMPLETED,
}
