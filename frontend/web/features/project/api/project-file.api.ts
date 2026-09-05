import { api } from "@/lib/axios";

export interface ProjectFile {
  id: string;
  projectId: string;
  sprintId: string | null;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  addedAt: string;
}

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const response = await api.get(`/api/projects/${projectId}/files`);
  return response.data.data;
}

export async function uploadProjectFile(projectId: string, file: File, sprintId?: string): Promise<ProjectFile> {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error("Chọn tệp có dung lượng từ 1 byte đến 10 MB");
  const data = new FormData();
  data.append("file", file);
  if (sprintId) data.append("sprintId", sprintId);
  const response = await api.post(`/api/projects/${projectId}/files`, data, { headers: { "Content-Type": undefined } });
  return response.data.data;
}

export async function deleteProjectFile(projectId: string, fileId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}/files/${fileId}`);
}

export async function downloadProjectFile(projectId: string, file: Pick<ProjectFile, "id" | "name">): Promise<void> {
  const response = await api.get(`/api/projects/${projectId}/files/${file.id}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
