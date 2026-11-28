import { Download, FileQuestion } from "lucide-react";
import { DocumentIcon } from "@/features/documents/components/common/document-icon";
import { DocumentItemType } from "@/features/documents/types/documents.enums";
import { PREVIEW_MESSAGES } from "@/features/documents/types/document-preview.constants";
import { PreviewAction } from "./preview-ui";

export function DocumentPreviewExample() {
  return (
    <div
      aria-label="Sample unsupported file preview"
      className="mt-5 overflow-hidden rounded-panel border border-border bg-background"
    >
      <div className="flex min-w-0 items-center gap-3 border-b border-border p-3">
        <DocumentIcon
          item={{
            type: DocumentItemType.FILE,
            name: "Research archive.zip",
            mimeType: "application/zip",
          }}
          iconSize={22}
          className="size-10 rounded-panel border border-border"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Research archive.zip</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            3.2 MB · Sample file preview
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 p-5 text-center">
        <FileQuestion
          aria-hidden="true"
          className="size-7 text-muted-foreground"
        />
        <p className="text-sm font-semibold">
          {PREVIEW_MESSAGES.unsupportedTitle}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {PREVIEW_MESSAGES.unsupportedDescription}
        </p>
        <PreviewAction>
          <Download aria-hidden="true" />
          {PREVIEW_MESSAGES.download}
        </PreviewAction>
      </div>
    </div>
  );
}
