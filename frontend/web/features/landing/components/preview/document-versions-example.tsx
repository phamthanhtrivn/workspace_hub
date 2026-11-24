import {
  CheckCircle2,
  Circle,
  CircleDot,
  History,
  UploadCloud,
  X,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import {
  VERSION_MENU_CLASSES,
  VERSION_MESSAGES,
} from "@/features/documents/types/document-version.constants";
import { cn } from "@/lib/utils";
import { PreviewAction, PreviewBadge } from "./preview-ui";

export function DocumentVersionsExample() {
  return (
    <div
      aria-label="Sample document version management"
      className="mt-5 space-y-4 rounded-panel border border-border bg-background p-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <History aria-hidden="true" className="size-4" />
        Version management
      </p>
      <div className="flex flex-col items-center gap-2 rounded-panel border-2 border-dashed border-border p-4 text-center">
        <UploadCloud
          aria-hidden="true"
          className="size-6 text-muted-foreground"
        />
        <p className="text-sm font-semibold">Upload new version</p>
        <p className="text-xs text-muted-foreground">
          {VERSION_MESSAGES.dropHelp}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {VERSION_MESSAGES.currentHelp}
      </p>
      <div className="divide-y divide-border rounded-panel border border-border">
        <div className="flex items-center gap-3 p-3 text-xs">
          <Circle aria-hidden="true" className="size-4 text-muted-foreground" />
          <span>v2</span>
          <span className="ml-auto text-muted-foreground">Latest upload</span>
          <MoreHorizontal
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-3 bg-info-soft/10 p-3 text-xs">
          <CircleDot aria-hidden="true" className="size-4 text-info-content" />
          <span>v1</span>
          <PreviewBadge tone="info">Current</PreviewBadge>
          <MoreHorizontal
            aria-hidden="true"
            className="ml-auto size-4 text-muted-foreground"
          />
        </div>
      </div>
      <div
        aria-label="Sample version actions"
        className={cn(
          "ml-auto rounded-panel border border-border bg-card p-1",
          VERSION_MENU_CLASSES.content,
        )}
      >
        <p className={VERSION_MENU_CLASSES.item}>
          <Eye aria-hidden="true" className="size-3.5" />
          Preview version
        </p>
        <p className={VERSION_MENU_CLASSES.item}>
          <Download aria-hidden="true" className="size-3.5" />
          Download version
        </p>
        <p
          className={cn(
            VERSION_MENU_CLASSES.item,
            VERSION_MENU_CLASSES.destructive,
          )}
        >
          <Trash2 aria-hidden="true" className="size-3.5" />
          {VERSION_MESSAGES.deleteAction}
        </p>
        <p className="border-t border-border px-3 pt-3 pb-2 font-normal leading-relaxed text-muted-foreground">
          Only the owner can delete versions. Current and the last remaining
          version are protected.
        </p>
      </div>
      <div className="flex justify-end">
        <PreviewAction>{VERSION_MESSAGES.saveCurrent}</PreviewAction>
      </div>
      <div
        aria-label="Sample version upload status"
        className="rounded-panel border border-border bg-card p-3"
      >
        <p className="flex items-center justify-between gap-2 text-xs font-semibold">
          {VERSION_MESSAGES.uploadFinished}
          <X aria-hidden="true" className="size-4 text-muted-foreground" />
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2
            aria-hidden="true"
            className="size-4 text-success-content"
          />
          Interview notes.docx · Upload complete
        </p>
      </div>
    </div>
  );
}
