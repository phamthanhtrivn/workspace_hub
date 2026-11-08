"use client";
import { NativeCheckbox } from "@/components/ui/checkbox";

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { DocumentBulkSelection } from "../../hooks/useDocumentBulkSelection";
import {
  DocumentBulkAction as Action,
  DOCUMENT_BULK_LABELS as LABEL,
  DOCUMENT_BULK_MESSAGES as M,
} from "../../types/document-bulk.types";
import { DocumentViewType } from "../../types/documents.enums";
import { getBulkBlockers } from "../../utils/document-bulk";
import { DocumentsConfirmDialog } from "../ui/documents-confirm-dialog";
import FolderPickerModal from "../common/folder-picker-modal";

export function DocumentBulkControls({
  selection,
  activeView,
  projectId,
  currentFolderId,
  projectRootFolderId,
  projectRootLabel,
  onStart,
}: {
  selection: DocumentBulkSelection;
  activeView: DocumentViewType;
  projectId?: string;
  currentFolderId: string | null;
  projectRootFolderId: string | null;
  projectRootLabel?: string;
  onStart: () => void;
}) {
  if (!selection.active)
    return (
      <div>
        <Button type="button" variant="outline" size="sm" onClick={onStart}>
          Select items
        </Button>
      </div>
    );
  const onlyProjectItems = !!projectId || (selection.items.length > 0 && selection.items.every(item => !!item.projectId));
  const actions =
    activeView === DocumentViewType.TRASH
      ? [Action.RESTORE, Action.DELETE]
      : onlyProjectItems
        ? [Action.MOVE, Action.DELETE]
        : [Action.MOVE, Action.STAR, Action.UNSTAR, Action.TRASH];
  if (!onlyProjectItems && activeView !== DocumentViewType.TRASH && selection.items.some(item => !!item.projectId)) actions.push(Action.DELETE);
  const blockers = actions.map((action) => ({
    action,
    blocked: getBulkBlockers(selection.items, action),
  }));
  const requested = selection.requestedAction;

  return (
    <div className="min-w-0 space-y-3 rounded-panel border border-border bg-muted p-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <NativeCheckbox
            className="h-4 w-4 accent-primary"
            checked={selection.allSelected}
            disabled={selection.busy}
            onChange={() =>
              selection.allSelected
                ? selection.clear()
                : void selection.selectAll()
            }
          />
          {selection.loadToken
            ? "Selecting all results…"
            : "Select all results"}
        </label>
        <span role="status" className="text-sm text-muted-foreground">
          {selection.items.length} selected
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={selection.busy}
          onClick={selection.clear}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={selection.busy}
          onClick={selection.cancel}
        >
          Cancel selection
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {blockers.map(({ action, blocked }) => (
          <Button
            key={action}
            type="button"
            variant={action === Action.DELETE ? "destructive" : "outline"}
            size="sm"
            disabled={
              selection.busy || !selection.items.length || !!blocked.length
            }
            title={
              blocked.length
                ? `${blocked.map((item) => item.name).join(", ")}: ${blocked[0].reason}`
                : !selection.items.length
                  ? M.NO_SELECTION
                  : undefined
            }
            className="disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => selection.requestAction(action)}
          >
            {LABEL[action]}
          </Button>
        ))}
      </div>
      {blockers.some((entry) => entry.blocked.length) ? (
        <Collapsible className="text-xs text-muted-foreground">
          <CollapsibleTrigger className="cursor-pointer">
            Some actions are unavailable. Review items to deselect.
          </CollapsibleTrigger>
          <CollapsibleContent><ul className="mt-2 max-h-36 space-y-1 overflow-auto">
            {blockers.flatMap(({ action, blocked }) =>
              blocked.map((item) => (
                <li key={`${action}:${item.id}`} className="break-words">
                  <strong>{LABEL[action]}</strong>: {item.name} — {item.reason}
                </li>
              )),
            )}
          </ul></CollapsibleContent>
        </Collapsible>
      ) : null}
      {requested === Action.MOVE ? (
        <FolderPickerModal
          open
          movingItemId={selection.items[0]?.id ?? ""}
          movingItemIds={selection.items.map((item) => item.id)}
          initialFolderId={currentFolderId}
          projectId={selection.items[0]?.projectId ?? undefined}
          projectRootFolderId={projectRootFolderId}
          rootLabel={projectRootLabel}
          busy={selection.busy}
          onClose={selection.closeAction}
          onSelectFolder={selection.execute}
          confirmLabel={`Move ${selection.items.length} items here`}
        />
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
