export type RecordingStatus =
  | "STARTING"
  | "RECORDING"
  | "PAUSING"
  | "PAUSED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "DELETED";
export type RecordingLayout = "speaker" | "grid" | "screen";
export type RecordingTemplateLayout = RecordingLayout | `app:TR_${string}`;
export interface RecordingSettings {
  autoRecord: boolean;
  layout: RecordingLayout;
}

export interface MeetingRecording {
  id: string;
  meetingId: string;
  joinToken: string;
  meetingTitle: string;
  title: string;
  ownerId: string;
  startedBy: string;
  status: RecordingStatus;
  requestedAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
  completedAt: string | null;
  sizeBytes: string | null;
  durationSeconds: number | null;
  failureCode: string | null;
  capabilities: { canView: boolean; canDownload: boolean; canManage: boolean };
}

export interface RecordingRoomStatus {
  needsRecordingPermission?: boolean;
  canRequestRecording?: boolean;
  recordingRequest?: RecordingPermissionRequest | null;
  recordingRequests?: RecordingPermissionRequest[];
  meetingId: string;
  ownerId: string;
  recordingAvailable: boolean;
  unavailableReason: string | null;
  settings: RecordingSettings;
  pauseAvailable: boolean;
  customLayoutsAvailable: boolean;
  recording: {
    id: string;
    status: RecordingStatus;
    startedAt: string | null;
    stoppedAt: string | null;
    stopRequestedAt: string | null;
    version: number;
    layout: RecordingLayout;
    recordedSeconds: number;
    segmentStartedAt: string | null;
  } | null;
  capabilities: {
    canStart: boolean;
    canStop: boolean;
    canGrantRecord: boolean;
    canPause: boolean;
    canResume: boolean;
  };
}

export interface RecordingPermissionRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  requestedAt: string;
  expiresAt: string;
  userId?: string;
  displayName?: string;
}

export interface RecordingPage {
  items: MeetingRecording[];
  page: number;
  totalPages: number;
  total: number;
}

export interface RecordingPermission {
  profile?: { fullName: string | null; email: string | null } | null;
  userId: string;
  canDownload: boolean;
}

export interface RecordingQuery {
  page?: number;
  limit?: number;
  search?: string;
  scope?: "owned" | "shared" | "all";
  status?: RecordingStatus;
}
