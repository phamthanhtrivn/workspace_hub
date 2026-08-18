import {
  ApiValidationErrors,
  AuthErrorResponse,
} from "../types/auth.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidationErrors = (value: unknown): value is ApiValidationErrors => {
  if (!isRecord(value)) return false;

  return Object.values(value).every((message) => typeof message === "string");
};

const getAuthErrorData = (error: unknown): AuthErrorResponse | null => {
  if (!isRecord(error)) return null;

  const response = error.response;
  if (!isRecord(response)) return null;

  const data = response.data;
  if (!isRecord(data)) return null;

  return {
    message: typeof data.message === "string" ? data.message : undefined,
    errors: isValidationErrors(data.errors) ? data.errors : undefined,
  };
};

export const getAuthValidationErrors = (
  error: unknown,
): ApiValidationErrors => getAuthErrorData(error)?.errors ?? {};

export const getAuthErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => getAuthErrorData(error)?.message ?? fallbackMessage;
