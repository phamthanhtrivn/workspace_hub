type MessageFormatter = (id: string) => string;

const MESSAGE_ID_PATTERN = /^(?:app|project)\.[a-zA-Z0-9_.-]+$/;

export function getProjectErrorMessage(
  error: unknown,
  formatMessage: MessageFormatter,
  fallbackId: string,
): string {
  if (!(error instanceof Error) || !error.message) {
    return formatMessage(fallbackId);
  }
  return MESSAGE_ID_PATTERN.test(error.message)
    ? formatMessage(error.message)
    : error.message;
}
