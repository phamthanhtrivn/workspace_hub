import { FileText, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { MESSAGE_CLIPBOARD_MESSAGES, type PastingMessageFile } from "../../types/message-clipboard.types";

interface PastingMessageFilesProps {
  files: PastingMessageFile[];
  onRemove: (id: string) => void;
}

export default function PastingMessageFiles({ files, onRemove }: PastingMessageFilesProps) {
  if (!files.length) return null;
  return (
    <div aria-label="Copied attachments" className="mb-2 flex flex-wrap gap-2" aria-live="polite">
      {files.map((file) => (
        <div key={file.id} className={`flex max-w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${file.status === "error" ? "bg-destructive-soft text-destructive-content" : "bg-muted text-foreground"}`}>
          <FileText size={16} className="shrink-0" aria-hidden="true" />
          <div className="min-w-0 max-w-40">
            <p className="truncate">{file.name}</p>
            <p>{file.status === "error" ? MESSAGE_CLIPBOARD_MESSAGES.prepareFailed : MESSAGE_CLIPBOARD_MESSAGES.preparing}</p>
          </div>
          {file.status === "downloading" && <Spinner size={14} />}
          <IconButton label={`Remove ${file.name}`} showTooltip={false} size="icon-sm" onClick={() => onRemove(file.id)}>
            <X size={14} aria-hidden="true" />
          </IconButton>
        </div>
      ))}
    </div>
  );
}
