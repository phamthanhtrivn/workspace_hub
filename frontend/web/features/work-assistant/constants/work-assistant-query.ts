export const WORK_ASSISTANT_QUERY_ROOT = ["work-assistant"] as const;
/** RAM-only cache; a separate fresh permission check gates cached content. */
export const WORK_ASSISTANT_READ_POLICY = {
  retry: false,
  refetchInterval: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: (query: { state: { status: string } }) =>
    query.state.status !== "error",
  refetchOnMount: true,
  staleTime: 30_000,
  gcTime: 300_000,
} as const;
