"use client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { DocumentBulkSelection } from "../../hooks/useDocumentBulkSelection";
import {
  DocumentBulkAction as Action,
  DOCUMENT_BULK_LABELS as LABEL,
  DOCUMENT_BULK_MESSAGES as M,
} from "../../types/document-bulk.types";
import { getBulkBlockers } from "../../utils/document-bulk";
import { DocumentsConfirmDialog } from "../ui/documents-confirm-dialog";
import FolderPickerModal from "../common/folder-picker-modal";
import { MoveDestinationBreadcrumb } from "./move-destination-breadcrumb";

export function DocumentBulkControls({
  selection,
  currentFolderId,
  projectRootFolderId,
  projectRootLabel,
}: {
  selection: DocumentBulkSelection;
  currentFolderId: string | null;
  projectRootFolderId: string | null;
  projectRootLabel?: string;
}) {
  if (!selection.active || !selection.action) return null;
  const action = selection.action;
  const blocked = getBulkBlockers(selection.items, action);
  const blockers = [{ action, blocked }];
  const requested = selection.requestedAction;

  return (
    <div className="min-w-0 space-y-2 border-b border-input pb-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <strong className="text-sm text-foreground">{LABEL[action]}</strong>
        <span
          role="status"
          className="inline-flex shrink-0 items-center rounded-control bg-info-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-info-content"
        >
          {selection.items.length} selected
        </span>
        <div className="flex min-h-8 shrink-0 items-center gap-1.5 rounded-control bg-muted/50 px-2">
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-foreground">
            <Checkbox
              autoFocus
              aria-label="Select all results"
              checked={
                selection.allSelected
                  ? true
                  : selection.items.length
                    ? "indeterminate"
                    : false
              }
              disabled={selection.busy}
              onCheckedChange={() =>
                selection.allSelected
                  ? selection.clear()
                  : void selection.selectAll()
              }
            />
            {selection.loadToken ? "Selecting..." : "Select all"}
          </label>
          <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={selection.busy || !selection.items.length}
            onClick={selection.clear}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={selection.busy && !selection.loadToken}
            onClick={selection.cancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={action === Action.DELETE ? "destructive" : "default"}
            size="sm"
            loading={selection.busy && !selection.loadToken}
            disabled={selection.busy}
            title={
              blocked.length
                ? blocked.map((item) => item.name).join(", ") +
                  ": " +
                  blocked[0].reason
                : !selection.items.length
                  ? M.NO_SELECTION
                  : undefined
            }
            className="disabled:cursor-not-allowed disabled:opacity-40"
            onClick={selection.requestAction}
          >
            {action === Action.MOVE ? "Continue" : LABEL[action]}
          </Button>
        </div>
      </div>
      {blockers.some((entry) => entry.blocked.length) ? (
        <Collapsible className="text-xs text-muted-foreground">
          <CollapsibleTrigger className="cursor-pointer">
            Some items cannot be used for this action. Review selection.
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 max-h-36 space-y-1 overflow-auto">
              {blockers.flatMap(({ action, blocked }) =>
                blocked.map((item) => (
                  <li key={`${action}:${item.id}`} className="break-words">
                    <strong>{LABEL[action]}</strong>: {item.name} —{" "}
                    {item.reason}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={selection.busy}
                      onClick={() => {
                        const selected = selection.items.find(
                          (candidate) => candidate.id === item.id,
                        );
                        if (selected) selection.toggle(selected);
                      }}
                    >
                      Deselect
                    </Button>
                  </li>
                )),
              )}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      {requested === Action.MOVE && !selection.dropDestination ? (
        <FolderPickerModal
          open
          movingItemId={selection.items[0]?.id ?? ""}
          movingItemIds={selection.items.map((item) => item.id)}
          initialFolderId={currentFolderId}
          projectId={selection.items[0]?.projectId ?? undefined}
          isStarred={Boolean(selection.items[0]?.isStarred)}
          projectRootFolderId={projectRootFolderId}
          rootLabel={projectRootLabel}
          busy={selection.busy}
          onClose={selection.closeAction}
          onSelectFolder={selection.execute}
          confirmLabel={`Move ${selection.items.length} items here`}
        />
      ) : null}
      {requested === Action.MOVE && selection.dropDestination ? (
        <DocumentsConfirmDialog
          open
          title={
            "Move " +
            selection.items.length +
            (selection.items.length === 1 ? " item?" : " items?")
          }
          description={
            "Selected: " +
            selection.items
              .slice(0, 5)
              .map((item) => item.name)
              .join(", ") +
            (selection.items.length > 5
              ? " and " + (selection.items.length - 5) + " more."
              : ".")
          }
          confirmLabel="Move"
          cancelLabel="Cancel"
          variant="warning"
          isLoading={selection.busy}
          onCancel={selection.closeAction}
          onConfirm={() => selection.execute()}
        >
          <MoveDestinationBreadcrumb destination={selection.dropDestination} />
        </DocumentsConfirmDialog>
      ) : null}
      {requested && requested !== Action.MOVE ? (
        <DocumentsConfirmDialog
          open
          title={`${LABEL[requested]} ${selection.items.length} selected items?`}
          description={`${selection.items
            .slice(0, 5)
            .map((item) => item.name)
            .join(
              ", ",
            )}${selection.items.length > 5 ? ` and ${selection.items.length - 5} more` : ""}.${requested === Action.DELETE ? " This permanently deletes the selected items and folder contents. This cannot be undone." : ""}`}
          confirmLabel={LABEL[requested]}
          cancelLabel="Cancel"
          variant={requested === Action.DELETE ? "danger" : "warning"}
          isLoading={selection.busy}
          onCancel={selection.closeAction}
          onConfirm={() => selection.execute()}
        />
      ) : null}
    </div>
  );
}
