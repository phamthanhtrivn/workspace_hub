"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/store/store";
import { useNotebook, useNotebookChat } from "../hooks/use-notebook";
import type { NotebookActionKey, NotebookActionRunner } from "../types";
import type { NotebookDialogAction } from "../types/notebook-list";
import { SourcePanel } from "./source-panel";
import { NotesPanel } from "./notes-panel";
import { NotebookChatPanel } from "./notebook-chat-panel";
import { NotebookDialog } from "./notebook-dialog";

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
    "m-0 hidden min-h-0 min-w-0 data-[state=active]:flex @min-[68rem]/notebook:flex";

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className="@container/notebook flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-hidden bg-muted/30 p-3 md:p-5"
    >
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link
              href="/ai"
              aria-label="Back to notebooks"
              title="Back to notebooks"
            >
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1
              className="line-clamp-2 text-page-title font-semibold [overflow-wrap:anywhere]"
              title={notebook.title}
            >
              {notebook.title}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Private · {notebook.sources.length}{" "}
              {notebook.sources.length === 1 ? "source" : "sources"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={query.saving}
              aria-label="Notebook actions"
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="w-full"
              onClick={() => setAction({ type: "rename", notebook })}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="w-full text-destructive-content data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-content"
              disabled={chat.busy}
              onClick={() => setAction({ type: "delete", notebook })}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete notebook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      {query.actionError && (
        <p
          role="alert"
          className="shrink-0 rounded-control border border-destructive-outline bg-destructive-soft px-3 py-2 text-sm text-destructive-content"
        >
          Unable to complete this action. Check source access and upload limits,
          then try again.
        </p>
      )}
      <TabsList
        aria-label="Notebook workspace"
        className="flex w-full @min-[68rem]/notebook:hidden"
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
        className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 [--sources-width:clamp(15rem,22cqw,19rem)] [--notes-width:clamp(16rem,23cqw,21rem)] data-[sources-open=false]:[--sources-width:3.25rem] data-[notes-open=false]:[--notes-width:3.25rem] @min-[68rem]/notebook:grid-cols-[var(--sources-width)_minmax(0,1fr)_var(--notes-width)]"
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
            className={`${panel} ${sourcesOpen ? "" : "@min-[68rem]/notebook:hidden"}`}
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
                  className="hidden @min-[68rem]/notebook:inline-flex"
                  aria-label="Collapse Sources"
                  title="Collapse Sources"
                  onClick={() => setSourcesOpen(false)}
                >
                  <PanelLeftClose aria-hidden="true" />
                </Button>
              }
            />
          </div>
          <div
            className={`hidden flex-col items-center gap-3 rounded-panel border border-border bg-card py-3 ${sourcesOpen ? "" : "@min-[68rem]/notebook:flex"}`}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Expand Sources"
              title="Expand Sources"
              onClick={() => setSourcesOpen(true)}
            >
              <PanelLeftOpen aria-hidden="true" />
            </Button>
            <FileText className="size-4 text-link" aria-hidden="true" />
          </div>
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
            className={`${panel} ${notesOpen ? "" : "@min-[68rem]/notebook:hidden"}`}
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
                  className="hidden @min-[68rem]/notebook:inline-flex"
                  aria-label="Collapse Notes"
                  title="Collapse Notes"
                  onClick={() => setNotesOpen(false)}
                >
                  <PanelRightClose aria-hidden="true" />
                </Button>
              }
            />
          </div>
          <div
            className={`hidden flex-col items-center gap-3 rounded-panel border border-border bg-card py-3 ${notesOpen ? "" : "@min-[68rem]/notebook:flex"}`}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Expand Notes"
              title="Expand Notes"
              onClick={() => setNotesOpen(true)}
            >
              <PanelRightOpen aria-hidden="true" />
            </Button>
            <NotebookPen className="size-4 text-link" aria-hidden="true" />
          </div>
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
