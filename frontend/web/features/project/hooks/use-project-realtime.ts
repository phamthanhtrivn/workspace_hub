import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/store';
import { projectSocketService } from '../api/project-socket.service';

const PROJECT_EVENTS = [
  'project:updated',
  'project:archived',
  'task:created',
  'task:updated',
  'task:deleted',
] as const;

export function useProjectRealtime(projectId: string): void {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken || !projectId) return;

    const socket = projectSocketService.connect(accessToken);
    const refreshProject = () => {
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    socket.emit('project:join', { projectId });
    PROJECT_EVENTS.forEach((event) => socket.on(event, refreshProject));

    return () => {
      PROJECT_EVENTS.forEach((event) => socket.off(event, refreshProject));
      socket.emit('project:leave', { projectId });
      projectSocketService.disconnect();
    };
  }, [accessToken, projectId, queryClient]);
}
