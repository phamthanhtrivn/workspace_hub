"use client";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { retryProjectAccessSync } from '../api/project.api';
import { accessSyncKey, useProjectAccessState } from '../hooks/use-project-access-state';
import { Button } from '@/components/ui/button';


export function ProjectAccessStatus({ projectId }: { projectId: string }) {
  const state = useProjectAccessState(projectId);
  const cache = useQueryClient();
  const retry = useMutation({ mutationFn: () => retryProjectAccessSync(projectId), onSuccess: () => cache.invalidateQueries({ queryKey: accessSyncKey(projectId) }) });
  if (state.isError) return <p role="alert" className="text-sm text-destructive-content">Unable to check chat and document access. <Button variant="outline" size="sm" onClick={() => void state.refetch()}>Retry</Button></p>;
  if (!state.data || ![state.data.documents, state.data.chat].some(status => status === 'PENDING' || status === 'FAILED')) return null;
  return <div role="status" className="flex items-center justify-between gap-3 rounded-control border border-border p-3 text-sm">
    <span>{state.data.documents !== 'READY' ? 'Documents are being prepared. ' : ''}{['PENDING', 'FAILED'].includes(state.data.chat) ? 'Chat access is being prepared.' : ''}</span>
    <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate()}>Retry</Button>
    {retry.isError && <span role="alert">Could not retry. Please try again.</span>}
  </div>;
}
