export const MEETING_LIMITS = {
  requestTimeoutMs: 45 * 60 * 1000,
  accessCheckIntervalMs: 15000,
  batchCharacters: 16000,
  noteCharacters: 6000,
  answerCharacters: 18000,
  reductionLevels: 6,
  noteTokens: 1536,
  answerTokens: 3072,
} as const;
