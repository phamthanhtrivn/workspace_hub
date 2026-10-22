"use client";

import { useRef, useState } from "react";
import { documentsApi } from "@/features/documents/api/documents.api";
import { notebooksApi } from "../api/notebooks.api";
import {
  uploadWithUniqueName,
  notebookUploadFolder,
  uploadError,
  uploadNotebookFiles,
  type UploadStage,
} from "../upload";
import type { Source } from "../types";

export function useSourceUpload(
  id: string,
  sources: Source[],
  refresh: () => Promise<unknown>,
) {
  const active = useRef(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState("");
  const uploadFiles = async (files: File[]) => {
    if (active.current || !files.length) return;
    active.current = true;
    setError("");
    try {
      let uploadFolder: Promise<string> | undefined;
      await uploadNotebookFiles(files, sources, {
        check: (file, batch) => notebooksApi.checkUpload(id, file, batch),
        upload: async (file) => {
          const parentFolderId = await (uploadFolder ??= notebookUploadFolder(
            id,
            documentsApi,
          ));
          return uploadWithUniqueName(file.name, (name) =>
            documentsApi.uploadFile(
              name === file.name
                ? file
                : new File([file], name, {
                    type: file.type,
                    lastModified: file.lastModified,
                  }),
              parentFolderId,
            ),
          );
        },
        add: (ids) => notebooksApi.add(id, ids),
        stage: setStage,
      });
    } catch (cause) {
      setError(uploadError(cause));
    } finally {
      try {
        await refresh();
      } catch {
        /* Keep the upload error instead of replacing it with a refresh error. */
      }
      setStage(null);
      active.current = false;
    }
  };
  return { uploadFiles, uploading: stage !== null, stage, error };
}
