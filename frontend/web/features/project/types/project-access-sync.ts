export const PROJECT_ACCESS_SYNC_STATUS = {
  NOT_CREATED: "NOT_CREATED", PENDING: "PENDING", READY: "READY", FAILED: "FAILED",
} as const;
export type ProjectAccessSyncStatus = typeof PROJECT_ACCESS_SYNC_STATUS[keyof typeof PROJECT_ACCESS_SYNC_STATUS];
export interface ProjectAccessState {
  projectId: string;
  documents: ProjectAccessSyncStatus;
  chat: ProjectAccessSyncStatus;
  message: string | null;
}
