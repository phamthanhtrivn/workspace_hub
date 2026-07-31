import { api } from "@/lib/axios";
import { DocumentItem, UserStorageQuota, PaginatedResponse, DocumentSortBy } from "../types/documents.types";

export const documentsApi = {
  getDocuments: async (params?: {
    folderId?: string;
    starred?: boolean;
    archived?: boolean;
    projectId?: string;
    page?: number;
    limit?: number;
    sortBy?: DocumentSortBy;
    search?: string;
  }): Promise<PaginatedResponse<DocumentItem[]>> => {
    const response = await api.get("/api/documents", {
      params: {
        folderId: params?.folderId,
        starred: params?.starred ? "true" : undefined,
        archived: params?.archived ? "true" : undefined,
        projectId: params?.projectId,
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        search: params?.search || undefined,
      },
    });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  getSharedDocuments: async (params?: {
    page?: number;
    limit?: number;
    sortBy?: DocumentSortBy;
    search?: string;
  }): Promise<PaginatedResponse<DocumentItem[]>> => {
    const response = await api.get("/api/documents/shared", {
      params: {
        page: params?.page,
        limit: params?.limit,
        sortBy: params?.sortBy,
        search: params?.search || undefined,
      },
    });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  getQuota: async (): Promise<UserStorageQuota> => {
    const response = await api.get("/api/documents/quota");
    return response.data.data;
  },

  createFolder: async (data: {
    name: string;
    parentFolderId?: string;
    projectId?: string;
  }): Promise<DocumentItem> => {
    const response = await api.post("/api/documents/folders", data);
    return response.data.data;
  },

  renameItem: async (id: string, name: string): Promise<DocumentItem> => {
    const response = await api.put(`/api/documents/${id}/rename`, { name });
    return response.data.data;
  },

  moveItem: async (
    id: string,
    parentFolderId: string | null,
  ): Promise<DocumentItem> => {
    const response = await api.put(`/api/documents/${id}/move`, {
      parentFolderId,
    });
    return response.data.data;
  },

  archiveItem: async (id: string): Promise<DocumentItem> => {
    const response = await api.delete(`/api/documents/${id}`);
    return response.data.data;
  },

  restoreItem: async (id: string): Promise<DocumentItem> => {
    const response = await api.put(`/api/documents/${id}/restore`);
    return response.data.data;
  },

  starItem: async (id: string): Promise<DocumentItem> => {
    const response = await api.put(`/api/documents/${id}/star`);
    return response.data.data;
  },

  unStarItem: async (id: string): Promise<DocumentItem> => {
    const response = await api.put(`/api/documents/${id}/un-star`);
    return response.data.data;
  },
};
