/** Fresh reads on explicit open; a failed read must wait for a user action. */
export const WORK_ASSISTANT_READ_POLICY = {
  retry: false,
  refetchInterval: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: (query: { state: { status: string } }) =>
    query.state.status !== "error",
  refetchOnMount: "always",
  staleTime: 0,
  // Do not retain conversation content after the panel closes or its scope changes.
  gcTime: 0,
} as const;
