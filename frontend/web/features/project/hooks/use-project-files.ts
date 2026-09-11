import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjectFiles, uploadProjectFile, deleteProjectFile } from "../api/project-file.api";

export function useProjectFiles(projectId: string) {
  const client = useQueryClient();
  const queryKey = ["projects", projectId, "files"];
  const query = useQuery({ queryKey, queryFn: () => getProjectFiles(projectId), enabled: Boolean(projectId) });
  const refresh = () => client.invalidateQueries({ queryKey });
  const upload = useMutation({
    mutationFn: ({ file, sprintId }: { file: File; sprintId?: string }) => uploadProjectFile(projectId, file, sprintId),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (fileId: string) => deleteProjectFile(projectId, fileId), onSuccess: refresh });
  return { ...query, upload, remove };
}
