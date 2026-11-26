import {
  BookOpen,
  Check,
  FileText,
  Plus,
  Send,
  StickyNote,
  Lock,
  Bot,
} from "lucide-react";
import { PreviewShell } from "./preview-shell";
import { PreviewAction, PreviewBadge, PreviewHeading } from "./preview-ui";
import {
  NotebookIcon,
  NotebookCategory,
  NotebookCounts,
} from "@/features/ai/components/notebook-identity";
import { NotebookLibraryExample } from "./notebook-library-example";

export function NotebookPreview() {
  return (
    <PreviewShell moduleId="ai">
      <div
        role="region"
        aria-label="Sample notebook with sources, cited answer and notes"
        tabIndex={0}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring @min-[800px]/preview-module:p-6"
      >
        <NotebookLibraryExample />
        <div className="flex items-start gap-3">
          <NotebookIcon />
          <div className="min-w-0 space-y-2">
            <PreviewHeading
              title="Prototype research"
              subtitle="A personal notebook for the graduation project."
            />
            <div className="flex flex-wrap items-center gap-2">
              <PreviewBadge>
                <Lock aria-hidden="true" className="size-3" />
                Private
              </PreviewBadge>
              <NotebookCategory category="Academic" />
              <NotebookCounts sources={2} notes={1} />
            </div>
          </div>
        </div>
        <div className="mt-6 grid min-w-0 gap-5 @min-[980px]/preview-module:grid-cols-[220px_minmax(0,1fr)_220px]">
          <aside className="min-w-0 rounded-panel border border-border bg-card">
            <h5 className="flex min-h-16 items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
              <FileText
                aria-hidden="true"
                className="size-4 text-primary-soft-foreground"
              />
              Sources{" "}
              <span className="ml-1 font-normal text-muted-foreground">
                2 / 5
              </span>
            </h5>
            <div className="space-y-4 p-4">
              <PreviewAction className="w-full">
                <Plus aria-hidden="true" />
                Add sources
              </PreviewAction>
              {["Research brief.pdf", "Interview notes.docx"].map((name) => (
                <div key={name} className="flex min-w-0 items-start gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 rounded-sm bg-primary p-0.5 text-primary-foreground"
                  />
                  <div className="min-w-0">
                    <p className="break-words text-xs font-medium">{name}</p>
                    <p className="mt-1 text-xs text-success-content">Ready</p>
                  </div>
                </div>
              ))}
              <p className="border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
                Choose the sources to include in your question.
              </p>
            </div>
          </aside>
          <div className="flex min-h-96 min-w-0 flex-col rounded-panel border border-border bg-card">
            <h5 className="flex min-h-16 items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
              <Bot aria-hidden="true" className="size-4 text-info-content" />
              Chat
            </h5>
            <div className="flex-1 space-y-5 p-4 sm:p-5">
              <p className="ml-auto max-w-sm rounded-panel rounded-br-sm bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground">
                What should we test in the first prototype?
              </p>
              <div className="rounded-panel rounded-tl-sm border border-border bg-muted/30 p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold">
                  <BookOpen aria-hidden="true" className="size-4 text-link" />
                  Notebook AI
                </p>
                <p className="text-sm leading-7">
                  The sample research points to two questions: can teammates
                  find their next task, and can they find the supporting
                  documents?
                </p>
                <p className="mt-3 text-sm leading-7">
                  Test those flows before adding more detail to the prototype.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PreviewBadge tone="info">
                    <FileText aria-hidden="true" className="size-3" />1 ·
                    Research brief
                  </PreviewBadge>
                  <PreviewBadge tone="info">2 · Interview notes</PreviewBadge>
                </div>
              </div>
            </div>
            <div className="m-4 flex min-h-24 items-end justify-between gap-3 rounded-panel border border-input bg-muted/40 p-3 text-xs text-muted-foreground">
              <span>Ask a question about your sources…</span>
              <Send aria-hidden="true" className="size-4 shrink-0" />
            </div>
            <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
              Illustrative answer. Check citations in your own notebook.
            </p>
          </div>
          <aside className="min-w-0 rounded-panel border border-border bg-card">
            <h5 className="flex min-h-16 items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
              <StickyNote
                aria-hidden="true"
                className="size-4 text-warning-content"
              />
              Notes
            </h5>
            <div className="p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <StickyNote aria-hidden="true" className="size-4 text-link" />
                Notes
              </p>
              <PreviewAction className="mt-4 w-full">
                <Plus aria-hidden="true" />
                Add note
              </PreviewAction>
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-sm font-semibold">First usability test</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Ask participants to locate a task and open its research brief.
                  Record where they hesitate.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PreviewShell>
  );
}
