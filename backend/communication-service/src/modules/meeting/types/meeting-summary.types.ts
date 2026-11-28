export const MEETING_SUMMARY_STATUSES = [
  'NOT_CREATED',
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
] as const;
export const MEETING_SUMMARY_STAGES = [
  'QUEUED',
  'EXTRACTING',
  'TRANSCRIBING',
  'SUMMARIZING',
  'COMPLETED',
  'FAILED',
] as const;
export const MEETING_SUMMARY_MESSAGES = {
  disabled: 'Meeting summaries are not configured.',
  unavailable:
    'Meeting summary processing is temporarily unavailable. Please try again shortly.',
  notReady:
    'The recording must finish processing before a summary can be created.',
} as const;

export interface MeetingSummaryResult {
  enabled: boolean;
  canCreate: boolean;
  availability: 'AVAILABLE' | 'DISABLED' | 'UNAVAILABLE';
  unavailableReason: string | null;
  status: (typeof MEETING_SUMMARY_STATUSES)[number];
  stage?: (typeof MEETING_SUMMARY_STAGES)[number];
  content?: string | null;
  error?: string | null;
  updatedAt?: string;
  transcribedChunks?: number;
}

export function parseMeetingSummary(
  payload: unknown,
): Omit<
  MeetingSummaryResult,
  'enabled' | 'canCreate' | 'availability' | 'unavailableReason'
> & { available: boolean } {
  if (!payload || typeof payload !== 'object')
    throw new Error('Invalid summary response');
  const value = payload as Record<string, unknown>;
  if (value.available !== undefined && typeof value.available !== 'boolean')
    throw new Error('Invalid summary availability');
  if (
    !MEETING_SUMMARY_STATUSES.includes(
      value.status as MeetingSummaryResult['status'],
    )
  )
    throw new Error('Invalid summary status');

  return {
    status: value.status as MeetingSummaryResult['status'],
    stage: MEETING_SUMMARY_STAGES.includes(
      value.stage as NonNullable<MeetingSummaryResult['stage']>,
    )
      ? (value.stage as MeetingSummaryResult['stage'])
      : undefined,
    content: typeof value.content === 'string' ? value.content : null,
    error: typeof value.error === 'string' ? value.error : null,
    updatedAt:
      typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
    transcribedChunks:
      Number.isSafeInteger(value.transcribedChunks) &&
      Number(value.transcribedChunks) >= 0
        ? Number(value.transcribedChunks)
        : undefined,
    // Older AI instances do not expose dependency readiness yet.
    available: value.available !== false,
  };
}
