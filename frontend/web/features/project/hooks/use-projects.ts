import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  archiveProject,
  createProject,
  getProject,
  getProjectMembers,
  getProjects,
  updateProject,
  type CreateProjectPayload,
  type UpdateProjectPayload,
} from "../api/project.api";

export const projectKeys = {
  all: ["projects"] as const,
  detail: (projectId: string) => ["projects", projectId] as const,
  members: (projectId: string) => ["projects", projectId, "members"] as const,
};

export function useProjects() {
  return useQuery({ queryKey: projectKeys.all, queryFn: getProjects });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });
}

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => getProjectMembers(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => updateProject(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useArchiveProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => archiveProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
