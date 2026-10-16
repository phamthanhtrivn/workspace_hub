export const AI_DOCUMENT_ROUTES = {
  ROOT: 'internal/ai/documents',
  RESOLVE: 'resolve',
  ACCESS_CHECK: 'access-check',
} as const;

export const AI_DOCUMENT_MESSAGES = {
  UNAUTHORIZED: 'Invalid AI service delegation',
  INVALID_SOURCE: 'Document source is unavailable for AI processing',
  SOURCE_CHANGED: 'Document source revision has changed',
  ARCHIVED: 'Archived documents or folders cannot be processed by AI',
  MAX_FILES: 5,
} as const;
