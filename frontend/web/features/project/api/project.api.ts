import { api } from "@/lib/axios";
import {
  ProjectRole,
  ProjectStatus,
  type Project,
  type ProjectMember,
} from "@/types/project";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
  timestamp?: string;
}

interface ProjectApiModel {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  ownerId: string;
  status: ProjectStatus;
  archived: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ProjectMemberApiModel {
  id: string;
  userId: string;
  role: ProjectRole;
  joinedAt?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  color: string;
  icon: string;
}

export interface UpdateProjectPayload {
  name?: string;
  color?: string;
  icon?: string;
  status?: ProjectStatus;
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || "API request failed");
  }

  return response.data.data;
}

function normalizeProject(project: ProjectApiModel): Project {
  const now = new Date().toISOString();

  return {
    id: project.id,
    name: project.name,
    color: project.color || "#6366f1",
    icon: project.icon || "📁",
    ownerId: project.ownerId,
    status: project.status,
    archived: project.archived,
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now,
    projectSetting: {
      id: `setting-${project.id}`,
      projectId: project.id,
      allowMemberCreateTask: true,
      allowMemberEditOthersTask: false,
      allowMemberEditOwnTask: true,
      allowMemberInvite: false,
    },
    members: [],
    tasks: [],
    labels: [],
  };
}

function normalizeMember(
  member: ProjectMemberApiModel,
  projectId: string,
): ProjectMember {
  return {
    id: member.id,
    projectId,
    userId: member.userId,
    displayName: member.userId,
    role: member.role,
    joinedAt: member.joinedAt || new Date().toISOString(),
  };
}

export async function getProjects(): Promise<Project[]> {
  const response = await api.get<ApiResponse<ProjectApiModel[]>>("/api/projects");
  return (unwrap(response) || []).map(normalizeProject);
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await api.get<ApiResponse<ProjectApiModel>>(
    `/api/projects/${projectId}`,
  );
  return normalizeProject(unwrap(response));
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<Project> {
  const response = await api.post<ApiResponse<ProjectApiModel>>(
    "/api/projects",
    payload,
  );
  return normalizeProject(unwrap(response));
}

export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload,
): Promise<Project> {
  const response = await api.patch<ApiResponse<ProjectApiModel>>(
    `/api/projects/${projectId}`,
    payload,
  );
  return normalizeProject(unwrap(response));
}

export async function archiveProject(projectId: string): Promise<void> {
  const response = await api.delete<ApiResponse<null>>(
    `/api/projects/${projectId}`,
  );
  unwrap(response);
}

export async function getProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  const response = await api.get<ApiResponse<ProjectMemberApiModel[]>>(
    `/api/projects/${projectId}/members`,
  );

  return (unwrap(response) || []).map((member) =>
    normalizeMember(member, projectId),
  );
}
