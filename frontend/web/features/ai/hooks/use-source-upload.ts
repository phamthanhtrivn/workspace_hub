"use client";
import { useRef, useState } from "react";
import { isAxiosError } from "axios";
import { store } from "@/store/store";
import { getUploadMimeType } from "@/lib/upload-policy";
import { notebooksApi } from "../api/notebooks.api";
import { validateUploadBatch, uploadError, type UploadStage } from "../upload";
import type { Source } from "../types";
export function useSourceUpload(
  id: string,
  sources: Source[],
  refresh: () => Promise<unknown>,
) {
  const active = useRef(false);
  const attempts = useRef(new Map<string, string>());
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [error, setError] = useState("");
  const uploadFiles = async (files: File[]) => {
    if (active.current || !files.length) return;
    active.current = true;
    setError("");
    const actorId = store.getState().auth.userId;
    const assertActor = () => {
      if (!actorId || store.getState().auth.userId !== actorId)
        throw new Error("Your account changed. Reopen the notebook.");
    };
    try {
      assertActor();
      validateUploadBatch(files, sources);
      setStage("UPLOADING");
      const ids: string[] = [];
      const completedKeys: string[] = [];
      for (const file of files) {
        const digest = await crypto.subtle.digest(
          "SHA-256",
          await file.arrayBuffer(),
        );
        const key = JSON.stringify([
          actorId,
          id,
          file.name,
          file.size,
          Array.from(new Uint8Array(digest)),
        ]);
        const operationId = attempts.current.get(key) ?? crypto.randomUUID();
        attempts.current.set(key, operationId);
        assertActor();
        const mimeType = getUploadMimeType(file.name, file.type);
        const upload = await notebooksApi.beginUpload(
          id,
          file,
          mimeType,
          operationId,
        );
        assertActor();
        if (upload.presignedUrl) {
          const response = await fetch(upload.presignedUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": mimeType, "If-None-Match": "*" },
          });
          if (!response.ok && response.status !== 412)
            throw new Error(
              "Upload failed. Select these files again to retry.",
            );
        }
        ids.push(upload.snapshotId);
        completedKeys.push(key);
      }
      assertActor();
      setStage("ADDING");
      await notebooksApi.confirmUploads(id, ids);
      assertActor();
      completedKeys.forEach((key) => attempts.current.delete(key));
    } catch (cause) {
      if (isAxiosError(cause) && cause.response?.status === 410)
        attempts.current.clear();
      if (store.getState().auth.userId === actorId)
        setError(uploadError(cause));
    } finally {
      try {
        if (store.getState().auth.userId === actorId) await refresh();
      } catch {
        /* Keep the original upload error. */
      }
      setStage(null);
      active.current = false;
    }
  };

  return { uploadFiles, uploading: stage !== null, stage, error };
}
