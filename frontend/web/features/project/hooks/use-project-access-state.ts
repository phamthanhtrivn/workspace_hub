"use client";
import { useQuery } from '@tanstack/react-query';
import { getProjectAccessState } from '../api/project.api';

export const accessSyncKey = (projectId: string) => ['projects', projectId, 'access-sync'] as const;
export function useProjectAccessState(projectId: string) {
  return useQuery({ queryKey: accessSyncKey(projectId), queryFn: () => getProjectAccessState(projectId), enabled: Boolean(projectId), refetchInterval: query => {
    const state = query.state.data;
    return !state || [state.documents, state.chat].some(status => status === 'PENDING' || status === 'FAILED') ? 3_000 : false;
  } });
}
