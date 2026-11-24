"use client";

import React from "react";
import { toast } from "sonner";
import { useDocumentUpload } from "../../hooks/useDocumentUpload";
import type { DocumentVersionUploadTarget } from "../../types/upload.types";
import { VERSION_MESSAGES } from "../../types/document-version.constants";
import { UploadProgress } from "../common/upload-progress";

interface VersionUploadContextValue {
  isUploading: boolean;
  uploadVersion: (
    file: File,
    target: DocumentVersionUploadTarget,
    onSuccess?: () => void,
  ) => Promise<void>;
}

const VersionUploadContext =
  React.createContext<VersionUploadContextValue | null>(null);

export function useVersionUpload() {
  const context = React.useContext(VersionUploadContext);
  if (!context)
    throw new Error("Version upload requires VersionUploadProvider");

  return context;
}

export function VersionUploadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [target, setTarget] = React.useState<DocumentVersionUploadTarget>();
  const [hidden, setHidden] = React.useState(false);
  const busy = React.useRef(false);
  const success = React.useRef<(() => void) | undefined>(undefined);
  const completed = React.useCallback(() => success.current?.(), []);
  const { uploads, isUploading, uploadFile, retryFailed, dismissUploads } =
    useDocumentUpload({
      currentFolderId: null,
      enableDropZone: false,
      versionTarget: target,
      onSuccess: completed,
    });
  const uploadVersion = React.useCallback(
    async (
      file: File,
      destination: DocumentVersionUploadTarget,
      onSuccess?: () => void,
    ) => {
      if (busy.current || isUploading) {
        toast.info(VERSION_MESSAGES.uploadBusy);

        return;
      }
      busy.current = true;
      success.current = onSuccess;
      setTarget(destination);
      setHidden(false);
      try {
        await uploadFile(file, destination);
      } finally {
        busy.current = false;
      }
    },
    [uploadFile, isUploading],
  );
  const dismiss = React.useCallback(() => {
    setHidden(true);
    if (!isUploading) dismissUploads();
  }, [dismissUploads, isUploading]);

  return (
    <VersionUploadContext.Provider value={{ uploadVersion, isUploading }}>
      {children}
      {!hidden && (
        <UploadProgress
          uploads={uploads}
          onRetry={(id) => void retryFailed(id)}
          onDismiss={dismiss}
          floating
          versionUpload
        />
      )}
    </VersionUploadContext.Provider>
  );
}
