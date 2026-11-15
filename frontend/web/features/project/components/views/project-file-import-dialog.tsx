"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import { DocumentFilePicker } from "@/features/documents/components/picker/document-file-picker";
import { fileCopyApi } from "@/features/documents/api/file-copy.api";
import { invalidateProjectChange } from "../../api/project-invalidation";
export function ProjectFileImportDialog({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const cache = useQueryClient();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-2xl bg-card p-0`}
        showCloseButton={!pending}
      >
        <DialogHeader className="border-b border-border">
          <DialogTitle>Add files</DialogTitle>
        </DialogHeader>
        <div className={`${dialogLayout.body} p-4`}>
          <DocumentFilePicker
            context={"project:" + projectId}
            onPending={setPending}
            validate={(files) =>
              files.some((file) => file.sizeBytes > 10 * 1024 * 1024)
                ? "Project files support up to 10 MiB."
                : ""
            }
            onConfirm={async (files, operationId, signal, assertActor) => {
              assertActor();
              const copied = await fileCopyApi.project(
                projectId,
                files,
                operationId,
                signal,
              );
              assertActor();
              await invalidateProjectChange(cache, {
                projectId,
                resource: "DOCUMENT",
              });
              toast.success(
                copied.every((file) => file.alreadyAdded)
                  ? "Already added to Project Documents"
                  : "Files added to Project Documents",
              );
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
