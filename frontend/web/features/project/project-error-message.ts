export function getProjectErrorMessage(
  error: unknown,
  fallbackMessage = "An error occurred. Please try again.",
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  return fallbackMessage;
}
