"use client";
import { useState } from "react";
import { Files } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import { DocumentFilePicker } from "@/features/documents/components/picker/document-file-picker";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/upload-policy";
import {
  copyDocumentsToChat,
  type AttachmentChatContext,
  type CopiedChatAttachment,
} from "../../../api/document-attachment.api";
interface Props {
  context: AttachmentChatContext;
  isOpen: boolean;
  onClose: () => void;
  overlayClassName?: string;
  tone?: "light" | "dark";
  onSelect: (files: CopiedChatAttachment[]) => void;
}
export default function MyFilesSelectModal({
  context,
  isOpen,
  onClose,
  overlayClassName = "z-[150]",
  tone,
  onSelect,
}: Props) {
  const [pending, setPending] = useState(false);
  if (!isOpen) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        overlayClassName={overlayClassName}
        className={`${dialogLayout.surface} z-[160] max-w-2xl bg-card p-0 text-card-foreground ${tone === "dark" ? "dark" : ""}`}
        showCloseButton={!pending}
      >
        <DialogHeader className="border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Files className="size-5" aria-hidden="true" />
            Choose files
          </DialogTitle>
        </DialogHeader>
        <div className={`${dialogLayout.body} p-4`}>
          <DocumentFilePicker
            key={context.chatType + ":" + context.chatId}
            context={"chat:" + context.chatType + ":" + context.chatId}
            allowFolders
            onPending={setPending}
            validate={(files) =>
              files.some(
                (file) =>
                  file.type !== DocumentItemType.FOLDER &&
                  file.sizeBytes > MAX_ATTACHMENT_SIZE_BYTES,
              )
                ? "Attachments support up to 10 MiB per file."
                : ""
            }
            onConfirm={async (files, operationId, signal, assertActor) => {
              assertActor();
              const copies = await copyDocumentsToChat(
                files,
                context,
                signal,
                operationId,
              );
              assertActor();
              onSelect(copies);
              onClose();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
