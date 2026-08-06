import { api } from "@/lib/axios";
import { store } from "@/store/store";
import {
  DocumentItem,
  UserStorageQuota,
  PaginatedResponse,
  DocumentSortBy,
  DocumentVersion,
  DocumentShare,
  SharingSettings,
} from "../types/documents.types";
import { UploadState } from "../types/documents.enums";
import axios from "axios";
import { DEFAULT_MIME_TYPE } from "../types/documents.constants";

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

  initiateUpload: async (data: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    parentFolderId?: string;
    projectId?: string;
  }): Promise<{ presignedUrl: string; s3Key: string }> => {
    const response = await api.post("/api/documents/upload/initiate", data);
    return response.data.data;
  },

  confirmUpload: async (data: {
    name: string;
    mimeType: string;
    sizeBytes: number;
    s3Key: string;
    parentFolderId?: string;
    projectId?: string;
  }): Promise<DocumentItem> => {
    const response = await api.post("/api/documents/upload/confirm", data);
    return response.data.data;
  },

  uploadFile: async (
    file: File,
    parentFolderId?: string | null,
    onProgress?: (percent: number, state: UploadState) => void,
  ): Promise<DocumentItem> => {
    const mimeType = file.type || DEFAULT_MIME_TYPE;

    onProgress?.(0, UploadState.INITIATING);
    const { presignedUrl, s3Key } = await documentsApi.initiateUpload({
      name: file.name,
      mimeType,
      sizeBytes: file.size,
      parentFolderId: parentFolderId || undefined,
    });

    onProgress?.(0, UploadState.UPLOADING);
    await axios.put(presignedUrl, file, {
      headers: {
        "Content-Type": mimeType,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const total = progressEvent.total || file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          onProgress(percent, UploadState.UPLOADING);
        }
      },
    });

    onProgress?.(100, UploadState.CONFIRMING);
    const item = await documentsApi.confirmUpload({
      name: file.name,
      mimeType,
      sizeBytes: file.size,
      s3Key,
      parentFolderId: parentFolderId || undefined,
    });

    return item;
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

  deleteItemPermanently: async (id: string): Promise<any> => {
    const response = await api.delete(`/api/documents/${id}/permanent`);
    return response.data;
  },

  getPreviewUrl: async (id: string, versionId?: string): Promise<string> => {
    const response = await api.get(`/api/documents/${id}/preview`, {
      params: { versionId },
    });
    return response.data.data.url;
  },

  getDownloadUrl: async (id: string, versionId?: string): Promise<string> => {
    const response = await api.get(`/api/documents/${id}/download-url`, {
      params: { versionId },
    });
    return response.data.data.url;
  },

  getVersions: async (id: string): Promise<DocumentVersion[]> => {
    const response = await api.get(`/api/documents/${id}/versions`);
    return response.data.data;
  },

  createVersion: async (
    id: string,
    data: { s3Key: string; sizeBytes: number; mimeType: string },
  ): Promise<DocumentVersion> => {
    const response = await api.post(`/api/documents/${id}/versions`, data);
    return response.data.data;
  },

  uploadNewVersion: async (
    id: string,
    file: File,
    onProgress?: (percent: number, state: UploadState) => void,
  ): Promise<DocumentVersion> => {
    const mimeType = file.type || DEFAULT_MIME_TYPE;

    onProgress?.(0, UploadState.INITIATING);
    const { presignedUrl, s3Key } = await documentsApi.initiateUpload({
      name: file.name,
      mimeType,
      sizeBytes: file.size,
    });

    onProgress?.(0, UploadState.UPLOADING);
    await axios.put(presignedUrl, file, {
      headers: {
        "Content-Type": mimeType,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const total = progressEvent.total || file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          onProgress(percent, UploadState.UPLOADING);
        }
      },
    });

    onProgress?.(100, UploadState.CONFIRMING);
    const version = await documentsApi.createVersion(id, {
      s3Key,
      sizeBytes: file.size,
      mimeType,
    });

    return version;
  },

  getSharing: async (
    id: string,
  ): Promise<SharingSettings> => {
    const response = await api.get(`/api/documents/${id}/sharing`);
    return response.data.data;
  },

  updateLinkAccess: async (
    id: string,
    linkAccess: string,
  ): Promise<DocumentItem> => {
    const response = await api.put(`/api/documents/${id}/sharing/link-access`, {
      linkAccess,
    });
    return response.data.data;
  },

  addShare: async (
    id: string,
    email: string,
    permission: string,
  ): Promise<DocumentShare> => {
    const response = await api.post(`/api/documents/${id}/sharing/shares`, {
      email,
      permission,
    });
    return response.data.data;
  },

  removeShare: async (id: string, shareId: string): Promise<void> => {
    await api.delete(
      `/api/documents/${id}/sharing/shares/${shareId}`,
    );
  },

  getPublicDocument: async (
    id: string,
  ): Promise<{ item: DocumentItem; userRole: string }> => {
    const response = await api.get(`/api/documents/public/${id}`);
    return response.data.data;
  },

  getPublicDownloadUrl: async (id: string, versionId?: string): Promise<string> => {
    const response = await api.get(`/api/documents/public/${id}/download-url`, {
      params: { versionId },
    });
    return response.data.data.url;
  },

  getPublicPreviewUrl: async (id: string, versionId?: string): Promise<string> => {
    const response = await api.get(`/api/documents/public/${id}/preview-url`, {
      params: { versionId },
    });
    return response.data.data.url;
  },

  getPublicVersions: async (id: string): Promise<DocumentVersion[]> => {
    const response = await api.get(`/api/documents/public/${id}/versions`);
    return response.data.data;
  },

  initiatePublicUpload: async (
    id: string,
    data: { name: string; mimeType: string; sizeBytes: number },
  ): Promise<{ presignedUrl: string; s3Key: string }> => {
    const response = await api.post(`/api/documents/public/${id}/upload/initiate`, data);
    return response.data.data;
  },

  createPublicVersion: async (
    id: string,
    data: { s3Key: string; sizeBytes: number; mimeType: string },
  ): Promise<DocumentVersion> => {
    const response = await api.post(`/api/documents/public/${id}/versions`, data);
    return response.data.data;
  },

  uploadNewPublicVersion: async (
    id: string,
    file: File,
    onProgress?: (percent: number, state: UploadState) => void,
  ): Promise<DocumentVersion> => {
    const mimeType = file.type || DEFAULT_MIME_TYPE;

    onProgress?.(0, UploadState.INITIATING);
    const { presignedUrl, s3Key } = await documentsApi.initiatePublicUpload(id, {
      name: file.name,
      mimeType,
      sizeBytes: file.size,
    });

    onProgress?.(0, UploadState.UPLOADING);
    await axios.put(presignedUrl, file, {
      headers: {
        "Content-Type": mimeType,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const total = progressEvent.total || file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          onProgress(percent, UploadState.UPLOADING);
        }
      },
    });

    onProgress?.(100, UploadState.CONFIRMING);
    const version = await documentsApi.createPublicVersion(id, {
      s3Key,
      sizeBytes: file.size,
      mimeType,
    });

    return version;
  },

  renamePublicItem: async (id: string, name: string): Promise<DocumentItem> => {
    const response = await api.put(`/api/documents/public/${id}/rename`, { name });
    return response.data.data;
  },

  downloadFolderAsZip: (
    id: string,
    folderName: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const normalizedApiBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
      const url = `${normalizedApiBase}/api/documents/${id}/download-folder`;

      xhr.open("GET", url, true);
      xhr.responseType = "blob";
      xhr.withCredentials = true;

      // Add Bearer token from Redux store if present
      const token = store.getState().auth.accessToken;
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      // Forward auth headers from axios defaults
      const axiosHeaders = api.defaults.headers.common as Record<string, string>;
      Object.entries(axiosHeaders).forEach(([key, value]) => {
        if (value) xhr.setRequestHeader(key, String(value));
      });

      xhr.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        } else if (onProgress) {
          // Indeterminate — pulse at received bytes
          onProgress(-1);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = new Blob([xhr.response], { type: "application/zip" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${folderName}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        } else {
          reject(new Error(`Download failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during folder download"));
      xhr.send();
    });
  },

  downloadPublicFolderAsZip: (
    id: string,
    folderName: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const normalizedApiBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
      const url = `${normalizedApiBase}/api/documents/public/${id}/download-folder`;

      xhr.open("GET", url, true);
      xhr.responseType = "blob";
      xhr.withCredentials = true;

      xhr.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        } else if (onProgress) {
          // Indeterminate — pulse at received bytes
          onProgress(-1);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = new Blob([xhr.response], { type: "application/zip" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${folderName}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        } else {
          reject(new Error(`Download failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during folder download"));
      xhr.send();
    });
  },

  getPublicFolderChildren: async (
    id: string,
    folderId?: string,
  ): Promise<DocumentItem[]> => {
    const response = await api.get(`/api/documents/public/${id}/children`, {
      params: { folderId },
    });
    return response.data.data;
  },
};
