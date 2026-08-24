import { api } from "@/lib/axios";
import {
  ProjectRole,
  ProjectStatus,
  ProjectType,
  ProjectTemplate,
  type Project,
  type ProjectMember,
} from "@/features/project/types/project";

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
  description?: string | null;
  ownerId: string;
  status: ProjectStatus;
  projectType?: ProjectType | null;
  startDate?: string | null;
  dueDate?: string | null;
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

interface UserProfileApiModel {
  id: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  color: string;
  icon: string;
  projectType: ProjectType;
  template?: ProjectTemplate;
}

export interface UpdateProjectPayload {
  name?: string;
  color?: string;
  icon?: string;
  status?: ProjectStatus;
  projectType?: ProjectType;
  description?: string;
  startDate?: string | null;
  dueDate?: string | null;
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
    description: project.description || "",
    ownerId: project.ownerId,
    status: project.status,
    projectType: project.projectType || ProjectType.GENERAL,
    startDate: project.startDate || undefined,
    dueDate: project.dueDate || undefined,
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
  profile?: UserProfileApiModel,
): ProjectMember {
  return {
    id: member.id,
    projectId,
    userId: member.userId,
    displayName: profile?.fullName?.trim() || "Người dùng",
    avatarUrl: profile?.avatarUrl || undefined,
    role: member.role,
    joinedAt: member.joinedAt || new Date().toISOString(),
  };
}

export async function getProjects(): Promise<Project[]> {
  const response =
    await api.get<ApiResponse<ProjectApiModel[]>>("/api/projects");
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
  const members = unwrap(response) || [];

  if (members.length === 0) return [];

  let profilesById = new Map<string, UserProfileApiModel>();
  try {
    const profilesResponse = await api.get<ApiResponse<UserProfileApiModel[]>>(
      "/api/users/profiles/bulk",
      { params: { ids: members.map((member) => member.userId).join(",") } },
    );
    profilesById = new Map(
      (unwrap(profilesResponse) || []).map((profile) => [profile.id, profile]),
    );
  } catch {
    // Keep project membership usable if profile enrichment is unavailable.
  }

  return members.map((member) =>
    normalizeMember(member, projectId, profilesById.get(member.userId)),
  );
}
