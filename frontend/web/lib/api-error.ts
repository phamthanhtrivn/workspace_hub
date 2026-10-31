import { isAxiosError } from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<unknown>(error)) {
    const body = error.response?.data;
    if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" && body.message) {
      return body.message;
    }
  }
  return fallback;
}
