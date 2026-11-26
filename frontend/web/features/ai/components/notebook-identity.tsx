import { BookOpen, FileText, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  notebookThemes,
  NOTEBOOK_DEFAULT_THEME,
  type NotebookTheme,
} from "../types/notebook-presentation";

export function NotebookIcon({
  theme = NOTEBOOK_DEFAULT_THEME,
  className,
}: {
  theme?: NotebookTheme;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-control",
        notebookThemes[theme].icon,
        className,
      )}
    >
      <BookOpen className="size-5" aria-hidden="true" />
    </span>
  );
}

export function NotebookCategory({
  category,
  theme = NOTEBOOK_DEFAULT_THEME,
}: {
  category?: string;
  theme?: NotebookTheme;
}) {
  return category ? (
    <span
      title={category}
      className={cn(
        "max-w-40 truncate rounded-full border px-2.5 py-0.5 text-xs font-medium",
        notebookThemes[theme].badge,
      )}
    >
      {category}
    </span>
  ) : null;
}

export function NotebookCounts({
  sources,
  notes,
  className,
}: {
  sources: number;
  notes: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <FileText className="size-3.5 text-info-content" aria-hidden="true" />
        {sources} {sources === 1 ? "source" : "sources"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <StickyNote
          className="size-3.5 text-warning-content"
          aria-hidden="true"
        />
        {notes} {notes === 1 ? "note" : "notes"}
      </span>
    </div>
  );
}
