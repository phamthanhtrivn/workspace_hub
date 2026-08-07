export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
  timestamp?: string;
}

export function unwrapApiResponse<T>(
  response: { data: ApiResponse<T> },
  fallbackMessage = "API request failed",
): T {
  if (!response.data.success) {
    throw new Error(response.data.message || fallbackMessage);
  }
  return response.data.data;
}
