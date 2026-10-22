import { isAxiosError } from "axios";

export function recordingErrorMessage(error: unknown) {
  return isAxiosError<{ message?: string }>(error)
    ? (error.response?.data.message ?? "Could not update recording")
    : "Could not update recording";
}

export function recordingErrorIsPermanent(error: unknown) {
  return (
    isAxiosError(error) &&
    [400, 401, 403, 404].includes(error.response?.status ?? 0)
  );
}
