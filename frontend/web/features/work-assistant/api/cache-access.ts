import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function workAccessDenied(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const failure = error as { status?: number; response?: { status?: number } };

  return (failure.status ?? failure.response?.status) === 403;
}

export async function verifyWorkCacheAccess(
  client: QueryClient,
  root: QueryKey,
  read: () => Promise<{ permissionStamp: string }>,
) {
  const clearContent = () => {
    client.removeQueries({ queryKey: [...root, "history"] });
    client.removeQueries({ queryKey: [...root, "sessions"] });
  };
  try {
    const result = await read();
    const previous = client.getQueryData<{ permissionStamp: string }>([
      ...root,
      "cache-access",
    ]);
    if (!previous || previous.permissionStamp !== result.permissionStamp)
      clearContent();

    return result;
  } catch (error) {
    clearContent();
    throw error;
  }
}
