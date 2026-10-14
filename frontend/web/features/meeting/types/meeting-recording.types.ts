export type RecordingStatus =
  "STARTING" | "RECORDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DELETED";
export type RecordingLayout = "speaker" | "grid";

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
  meetingId: string;
  ownerId: string;
  recordingAvailable: boolean;
  unavailableReason: string | null;
  recording: {
    id: string;
    status: RecordingStatus;
    startedAt: string | null;
    stoppedAt: string | null;
    stopRequestedAt: string | null;
    version: number;
  } | null;
  capabilities: {
    canStart: boolean;
    canStop: boolean;
    canGrantRecord: boolean;
  };
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
  search?: string;
  scope?: "owned" | "shared" | "all";
  status?: RecordingStatus;
}
