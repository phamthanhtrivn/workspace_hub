"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/store/store";
import { useNotebook, useNotebookChat } from "../hooks/use-notebook";
import type { NotebookActionKey, NotebookActionRunner } from "../types";
import type { NotebookDialogAction } from "../types/notebook-list";
import { SourcePanel } from "./source-panel";
import { NotesPanel } from "./notes-panel";
import { NotebookChatPanel } from "./notebook-chat-panel";
import { NotebookDialog } from "./notebook-dialog";
import { NotebookWorkspaceHeader } from "./notebook-workspace-header";

export function NotebookWorkspace({ id }: { id: string }) {
  const userId = useAppSelector((state) => state.auth.userId);

  return userId ? (
    <Workspace key={`${userId}:${id}`} id={id} userId={userId} />
  ) : (
    <p className="p-6">Please sign in to open your notebooks.</p>
  );
}

function Workspace({ id, userId }: { id: string; userId: string }) {
  const query = useNotebook(id);
  const chat = useNotebookChat(id, query.refresh);
  const router = useRouter();
  const [tab, setTab] = useState("chat");
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [action, setAction] = useState<NotebookDialogAction | null>(null);
  const [pendingAction, setPendingAction] = useState<NotebookActionKey | null>(
    null,
  );
  const running = useRef(false);
  const run: NotebookActionRunner = (operation, key) => {
    if (running.current) return Promise.resolve(false);
    running.current = true;
    setPendingAction(key ?? null);

    return query
      .action(operation)
      .then(
        () => true,
        () => false,
      )
      .finally(() => {
        running.current = false;
        setPendingAction(null);
      });
  };
  if (query.isError)
    return (
      <div className="space-y-4 p-6" role="alert">
        <p>
          Unable to load this notebook or verify source access. Content is
          temporarily hidden.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/ai">
              <ArrowLeft aria-hidden="true" />
              Back to notebooks
            </Link>
          </Button>
        </div>
      </div>
    );
  if (!query.data)
    return <LoadingState label="Loading notebook..." className="p-6" />;
  const notebook = query.data;
  const selected = notebook.sources.filter(
    (source) => source.status === "READY" && !excluded.includes(source.id),
  );
  const selectSources = () => {
    setSourcesOpen(true);
    setTab("sources");
  };
  const panel =
    "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-border bg-card text-card-foreground";
  const slot =
    "m-0 hidden min-h-0 min-w-0 data-[state=active]:flex @min-[60rem]/notebook:flex";

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="@container/notebook flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-hidden bg-muted/30"
    >
      <NotebookWorkspaceHeader
        notebook={notebook}
        onAction={setAction}
        saving={query.saving}
        busy={chat.busy}
      />
      {query.actionError && (
        <p
          role="alert"
          className="mx-3 shrink-0 rounded-control border border-destructive-outline bg-destructive-soft px-3 py-2 text-sm text-destructive-content"
        >
          Unable to complete this action. Check source access and upload limits,
          then try again.
        </p>
      )}
      <TabsList
        aria-label="Notebook workspace"
        className="mx-3 flex @min-[60rem]/notebook:hidden"
      >
        <TabsTrigger value="sources" className="min-w-0 flex-1">
          <FileText className="size-4" aria-hidden="true" />
          Sources
        </TabsTrigger>
        <TabsTrigger value="chat" className="min-w-0 flex-1">
          <MessageSquare className="size-4" aria-hidden="true" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="notes" className="min-w-0 flex-1">
          <NotebookPen className="size-4" aria-hidden="true" />
          Notes
        </TabsTrigger>
      </TabsList>
      <div
        className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 px-3 pb-3 [--sources-width:clamp(14.5rem,21cqw,23rem)] [--notes-width:clamp(15.5rem,22cqw,25rem)] data-[sources-open=false]:[--sources-width:3.5rem] data-[notes-open=false]:[--notes-width:3.5rem] @min-[60rem]/notebook:grid-cols-[var(--sources-width)_minmax(0,1fr)_var(--notes-width)]"
        data-sources-open={sourcesOpen}
        data-notes-open={notesOpen}
      >
        <TabsContent
          forceMount
          value="sources"
          className={slot}
          data-collapsed={!sourcesOpen}
        >
          <div
            className={`${panel} ${sourcesOpen ? "" : "@min-[60rem]/notebook:hidden"}`}
          >
            <SourcePanel
              id={id}
              sources={notebook.sources}
              selected={selected.map((source) => source.id)}
              busy={chat.busy}
              run={run}
              pendingAction={query.saving ? pendingAction : null}
              refresh={query.refresh}
              toggle={(sourceId) =>
                setExcluded((current) =>
                  current.includes(sourceId)
                    ? current.filter((value) => value !== sourceId)
                    : [...current, sourceId],
                )
              }
              addOpen={addOpen}
              onAddOpenChange={setAddOpen}
              collapseControl={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hidden @min-[60rem]/notebook:inline-flex"
                  aria-label="Collapse Sources"
                  title="Collapse Sources"
                  onClick={() => setSourcesOpen(false)}
                >
                  <PanelLeftClose aria-hidden="true" />
                </Button>
              }
            />
          </div>
          {!sourcesOpen && (
            <CollapsedPanelRail
              label="Sources"
              count={notebook.sources.length}
              side="left"
              icon={FileText}
              iconTone="bg-primary-soft text-primary-soft-foreground"
              onExpand={() => setSourcesOpen(true)}
            />
          )}
        </TabsContent>
        <TabsContent forceMount value="chat" className={slot}>
          <div className={panel}>
            <NotebookChatPanel
              notebook={notebook}
              selected={selected}
              chat={chat}
              saving={query.saving}
              pendingAction={pendingAction}
              run={run}
              onSources={selectSources}
              onAddSources={() => setAddOpen(true)}
            />
          </div>
        </TabsContent>
        <TabsContent
          forceMount
          value="notes"
          className={slot}
          data-collapsed={!notesOpen}
        >
          <div
            className={`${panel} ${notesOpen ? "" : "@min-[60rem]/notebook:hidden"}`}
          >
            <NotesPanel
              notebook={notebook}
              saving={query.saving}
              pendingAction={pendingAction}
              run={run}
              collapseControl={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hidden @min-[60rem]/notebook:inline-flex"
                  aria-label="Collapse Notes"
                  title="Collapse Notes"
                  onClick={() => setNotesOpen(false)}
                >
                  <PanelRightClose aria-hidden="true" />
                </Button>
              }
            />
          </div>
          {!notesOpen && (
            <CollapsedPanelRail
              label="Notes"
              count={notebook.notes.length}
              side="right"
              icon={NotebookPen}
              iconTone="bg-warning-soft text-warning-content"
              onExpand={() => setNotesOpen(true)}
            />
          )}
        </TabsContent>
      </div>
      {action && (
        <NotebookDialog
          key={action.type}
          userId={userId}
          action={action}
          onClose={() => setAction(null)}
          onDeleted={() => router.push("/ai")}
        />
      )}
    </Tabs>
  );
}

function CollapsedPanelRail({
  label,
  count,
  side,
  icon: Icon,
  iconTone,
  onExpand,
}: {
  label: string;
  count: number;
  side: "left" | "right";
  icon: LucideIcon;
  iconTone: string;
  onExpand: () => void;
}) {
  const ExpandIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  return (
    <aside
      aria-label={`${label} collapsed`}
      className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-border bg-card text-card-foreground @min-[60rem]/notebook:flex"
    >
      <div className="flex h-16 shrink-0 items-center justify-center border-b border-border">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Expand ${label}`}
          title={`Expand ${label}`}
          onClick={onExpand}
        >
          <ExpandIcon aria-hidden="true" />
        </Button>
      </div>
      <button
        type="button"
        onClick={onExpand}
        title={`Expand ${label}`}
        aria-label={`Open ${label} panel`}
        className="flex min-h-0 flex-1 cursor-pointer flex-col items-center gap-3 px-1.5 py-4 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-control ${iconTone}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
          {count}
        </span>
        <span
          className={`mt-1 select-none text-xs font-medium tracking-wide [writing-mode:vertical-rl] ${side === "left" ? "rotate-180" : ""}`}
        >
          {label}
        </span>
      </button>
    </aside>
  );
}
