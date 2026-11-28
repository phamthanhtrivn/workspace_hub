import { api } from "@/lib/axios";
import type { DocumentItem, PaginatedResponse } from "../types/documents.types";

export type PickerDocument = DocumentItem & { versionId?: string };
export type PickerScope = "personal" | "shared" | "project";
export const FILE_PICKER_PAGE_SIZE = 12;
export const filePickerKey = (actorId?: string | null) =>
  ["documents", "picker", actorId] as const;
const PICKER_ROUTE = "/api/documents/picker";
const PROJECT_IMPORT_ROUTE = "/api/documents/project-imports";
export const fileCopyApi = {
  meetings: async (): Promise<
    { id: string; joinToken: string; title: string | null }[]
  > => (await api.get("/api/medias/copy-targets/meetings")).data.data,
  list: async (
    params: {
      scope: PickerScope;
      folderId?: string;
      projectId?: string;
      search: string;
      page: number;
    },
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<PickerDocument[]>> =>
    (
      await api.get(PICKER_ROUTE, {
        params: { ...params, limit: FILE_PICKER_PAGE_SIZE },
        signal,
      })
    ).data,
  project: async (
    projectId: string,
    documents: Pick<PickerDocument, "id" | "versionId">[],
    operationId: string,
    signal?: AbortSignal,
  ): Promise<{ id: string; name: string; alreadyAdded?: boolean }[]> =>
    (
      await api.post(
        PROJECT_IMPORT_ROUTE,
        {
          projectId,
          refs: documents.map((document) => ({
            documentId: document.id,
            versionId: document.versionId,
            operationId,
          })),
        },
        { signal, timeout: 180000 },
      )
    ).data.data,
};
