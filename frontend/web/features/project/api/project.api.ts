import { api } from "@/lib/axios";
import {
  ProjectRole,
  ProjectStatus,
  type Project,
  type ProjectMember,
  type ProjectSetting,
} from "@/features/project/types/project";
import type { PaginationMeta } from "./pagination";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
  timestamp?: string;
  meta?: PaginationMeta | null;
}

interface ProjectApiModel {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  ownerId: string;
  ownerDisplayName?: string | null;
  ownerAvatarUrl?: string | null;
  ownerEmail?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
  archived: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  projectSetting?: ProjectSetting | null;
  totalTaskCount?: number;
  completedTaskCount?: number;
}

interface ProjectMemberApiModel {
  id: string;
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  role: ProjectRole;
  canCreateTask: boolean;
  canEditOwnTask: boolean;
  canEditOthersTask: boolean;
  canManageMembers: boolean;
  canManageLabels: boolean;
  joinedAt?: string | null;
}

export interface UserProfileApiModel {
  id: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  color: string;
  icon: string;
  description?: string;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface UpdateProjectPayload {
  name?: string;
  color?: string;
  icon?: string;
  status?: ProjectStatus;
  description?: string;
  startDate?: string | null;
  dueDate?: string | null;
}

export interface ProjectListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: ProjectStatus;
}

export interface ProjectListResponse {
  data: Project[];
  meta: PaginationMeta;
}

export interface ProjectSpaceResponse {
  projectId: string;
  spaceId: string;
  channelId: string;
}

export interface ProjectSpaceStatusResponse {
  projectId: string;
  exists: boolean;
  spaceId: string | null;
  channelId: string | null;
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
    startDate: project.startDate || undefined,
    dueDate: project.dueDate || undefined,
    archived: project.archived,
    createdAt: project.createdAt || now,
    updatedAt: project.updatedAt || now,
    totalTaskCount: project.totalTaskCount || 0,
    completedTaskCount: project.completedTaskCount || 0,
    projectSetting: project.projectSetting || {
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
    displayName:
      member.displayName?.trim() ||
      member.email ||
      member.userId,
    avatarUrl: member.avatarUrl || undefined,
    role: member.role,
    canCreateTask: member.canCreateTask ?? false,
    canEditOwnTask: member.canEditOwnTask ?? false,
    canEditOthersTask: member.canEditOthersTask ?? false,
    canManageMembers: member.canManageMembers ?? false,
    canManageLabels: member.canManageLabels ?? false,
    joinedAt: member.joinedAt || new Date().toISOString(),
  };
}

function withOwnerMembers(projectModels: ProjectApiModel[]): Project[] {
  const projects = projectModels.map(normalizeProject);
  return projects.map((project, idx) => {
    const model = projectModels[idx];
    return {
      ...project,
      members: [
        {
          id: `owner-${project.id}`,
          projectId: project.id,
          userId: project.ownerId,
          displayName:
            model?.ownerDisplayName?.trim() || project.ownerId,
          avatarUrl: model?.ownerAvatarUrl || undefined,
          role: ProjectRole.ADMIN,
          canCreateTask: true,
          canEditOwnTask: true,
          canEditOthersTask: true,
          canManageMembers: true,
          canManageLabels: true,
          joinedAt: project.createdAt,
        },
      ],
    };
  });
}

function getFallbackProjectListMeta(
  query: ProjectListQuery,
  total: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasNext: query.page < totalPages,
  };
}

export async function getProjects(
  query: ProjectListQuery,
): Promise<ProjectListResponse> {
  const response = await api.get<ApiResponse<ProjectApiModel[]>>(
    "/api/projects",
    {
      params: {
        page: query.page,
        limit: query.limit,
        search: query.search || undefined,
        status: query.status,
      },
    },
  );
  const projectModels = unwrap(response) || [];
  return {
    data: withOwnerMembers(projectModels),
    meta:
      response.data.meta ??
      getFallbackProjectListMeta(query, projectModels.length),
  };
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

export async function openProjectSpace(
  projectId: string,
): Promise<ProjectSpaceResponse> {
  const response = await api.post<ApiResponse<ProjectSpaceResponse>>(
    `/api/projects/${projectId}/space`,
  );
  return unwrap(response);
}

export async function getProjectSpaceStatus(
  projectId: string,
): Promise<ProjectSpaceStatusResponse> {
  const response = await api.get<ApiResponse<ProjectSpaceStatusResponse>>(
    `/api/projects/${projectId}/space/status`,
  );
  return unwrap(response);
}

export async function getProjectMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  const response = await api.get<ApiResponse<ProjectMemberApiModel[]>>(
    `/api/projects/${projectId}/members`,
  );
  const members = unwrap(response) || [];
  return members.map((member) => normalizeMember(member, projectId));
}

export async function getUserProfiles(
  userIds: string[],
): Promise<Map<string, UserProfileApiModel>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();
  try {
    const response = await api.get<ApiResponse<UserProfileApiModel[]>>(
      "/api/users/profiles/bulk",
      { params: { ids: uniqueIds.join(",") } },
    );
    return new Map(
      (unwrap(response) || []).map((profile) => [profile.id, profile]),
    );
  } catch {
    return new Map();
  }
}
