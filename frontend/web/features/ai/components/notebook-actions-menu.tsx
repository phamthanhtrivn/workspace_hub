"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { NotebookDialogAction } from "../types/notebook-list";

export function NotebookActionsMenu({
  notebook,
  onAction,
  disabled = false,
  deleteDisabled = false,
}: {
  notebook: Exclude<NotebookDialogAction, { type: "create" }>["notebook"];
  onAction: (action: NotebookDialogAction) => void;
  disabled?: boolean;
  deleteDisabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="relative shrink-0"
          disabled={disabled}
          aria-label={`Actions for ${notebook.title}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="w-full"
          onClick={() => onAction({ type: "rename", notebook })}
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="w-full text-destructive-content data-[highlighted]:bg-destructive-soft data-[highlighted]:text-destructive-content"
          disabled={deleteDisabled}
          onClick={() => onAction({ type: "delete", notebook })}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete notebook
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
