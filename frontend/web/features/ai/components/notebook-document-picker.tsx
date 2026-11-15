"use client";
import { useState } from "react";
import { DocumentFilePicker } from "@/features/documents/components/picker/document-file-picker";
import type { PickerDocument } from "@/features/documents/api/file-copy.api";
import { notebooksApi } from "../api/notebooks.api";
import {
  validateDocumentSources,
  NOTEBOOK_SOURCE_LIMIT,
} from "../utils/notebook-source-selection";
import type { Source } from "../types";
export interface NotebookDocumentPickerProps {
  notebookId: string;
  sources: Source[];
  onAdded: () => Promise<unknown>;
  disabled: boolean;
  onPending: (pending: boolean) => void;
}
export function NotebookDocumentPicker({
  notebookId,
  sources,
  onAdded,
  disabled,
  onPending,
}: NotebookDocumentPickerProps) {
  const [accepted, setAccepted] = useState<PickerDocument[]>([]);
  const [refreshError, setRefreshError] = useState("");
  const extra = accepted.filter(
    (file) =>
      !sources.some(
        (source) =>
          source.document_id === file.id &&
          source.version_id === file.versionId,
      ),
  );
  const effective = [
    ...sources,
    ...extra.map((file) => ({ size_bytes: file.sizeBytes })),
  ];

  return (
    <>
      <DocumentFilePicker
        context={"notebook:" + notebookId}
        disabled={disabled}
        onPending={onPending}
        maxSelection={Math.max(0, NOTEBOOK_SOURCE_LIMIT - effective.length)}
        isAdded={(file) =>
          sources.some(
            (source) =>
              source.document_id === file.id &&
              source.version_id === file.versionId,
          ) ||
          accepted.some(
            (source) =>
              source.id === file.id && source.versionId === file.versionId,
          )
        }
        validate={(files) => {
          try {
            validateDocumentSources(files, effective);

            return "";
          } catch (error) {
            return (error as Error).message;
          }
        }}
        onConfirm={async (files, operationId, signal, assertActor) => {
          assertActor();
          await notebooksApi.addCopies(notebookId, files, operationId, signal);
          assertActor();
          setAccepted((current) => [...current, ...files]);
          try {
            await onAdded();
            setRefreshError("");
          } catch {
            setRefreshError(
              "Sources were added. Reload the notebook to refresh.",
            );
          }
        }}
      />
      {refreshError && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {refreshError}
        </p>
      )}
    </>
  );
}
