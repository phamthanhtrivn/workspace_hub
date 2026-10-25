export interface MeetingSummary {
  enabled: boolean;
  canCreate: boolean;
  status: "NOT_CREATED" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  stage?:
    | "QUEUED"
    | "EXTRACTING"
    | "TRANSCRIBING"
    | "SUMMARIZING"
    | "COMPLETED"
    | "FAILED";
  content?: string | null;
  error?: string | null;
  updatedAt?: string;
  transcribedChunks?: number;
}
