"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { reopenTask } from '../../api/task.api';
import type { Task } from '../../types/project';

export function TaskReopenButton({ task, parent, onTaskClick }: {
  task: Task; parent?: Task; onTaskClick?: (task: Task) => void;
}) {
  const cache = useQueryClient();
  const reopen = useMutation({ mutationFn: () => reopenTask(task.id), onSuccess: () => {
    void cache.invalidateQueries({ queryKey: ['projects'] });
    void cache.invalidateQueries({ queryKey: ['tasks', task.id] });
    toast.success('Task reopened');
  }, onError: error => {
    const message = isAxiosError(error) ? error.response?.data?.message : undefined;
    toast.error(message || 'Unable to reopen task', parent && onTaskClick ? {
      action: { label: 'Open parent', onClick: () => onTaskClick(parent) },
    } : undefined);
  } });
  return <Button type="button" variant="outline" size="sm" disabled={reopen.isPending} onClick={() => reopen.mutate()}>
    {reopen.isPending ? 'Reopening…' : 'Reopen task'}
  </Button>;
}
