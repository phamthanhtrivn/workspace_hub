import { isAxiosError, type AxiosRequestConfig } from "axios";
import {
  SHARED_DOCUMENT_ACCESS_FAILURES,
  type SharedDocumentAccessCode,
} from "../types/shared-document-access.constants";

export const SHARED_DOCUMENT_ACCESS_REQUEST = {
  expectedBusinessErrors: {
    statuses: [
      ...new Set(
        SHARED_DOCUMENT_ACCESS_FAILURES.map((failure) => failure.status),
      ),
    ],
    codes: SHARED_DOCUMENT_ACCESS_FAILURES.map((failure) => failure.code),
    messages: SHARED_DOCUMENT_ACCESS_FAILURES.flatMap((failure) => [
      ...failure.messages,
    ]),
  },
} satisfies AxiosRequestConfig;

export function getSharedDocumentAccessCode(
  error: unknown,
): SharedDocumentAccessCode | undefined {
  if (!isAxiosError(error) || !error.response) return undefined;
  const status = error.response.status;
  const payload: unknown = error.response.data;
  const code =
    payload && typeof payload === "object" && "code" in payload
      ? payload.code
      : undefined;
  const message =
    typeof payload === "string"
      ? payload
      : payload && typeof payload === "object" && "message" in payload
        ? payload.message
        : undefined;

  return SHARED_DOCUMENT_ACCESS_FAILURES.find(
    (failure) =>
      failure.status === status &&
      (failure.code === code ||
        failure.messages.some((knownMessage) => knownMessage === message)),
  )?.code;
}
