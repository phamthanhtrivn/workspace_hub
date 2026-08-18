import {
  ApiValidationErrors,
  UserSettingErrorResponse,
} from "../types/user-setting.types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isValidationErrors = (value: unknown): value is ApiValidationErrors => {
  if (!isRecord(value)) return false;

  return Object.values(value).every((message) => typeof message === "string");
};

const getUserSettingErrorData = (
  error: unknown,
): UserSettingErrorResponse | null => {
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

export const getUserSettingValidationErrors = (
  error: unknown,
): ApiValidationErrors => getUserSettingErrorData(error)?.errors ?? {};

export const getUserSettingErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => getUserSettingErrorData(error)?.message ?? fallbackMessage;
