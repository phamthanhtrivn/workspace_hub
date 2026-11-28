"use client";

import { getActionErrorMessage } from "@/lib/permission-feedback";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { readableTextOnColor } from "@/lib/color";
import {
  useDeleteCalendar,
  useUpdateCalendar,
} from "../../hooks/use-calendar-queries";
import { WorkspaceCalendar } from "../../types/calendar.types";
import { CalendarModal } from "../modal/calendar-modal";
import { DeleteCalendarModal } from "../modal/delete-calendar-modal";
import { CalendarColorPopover } from "./calendar-color-popover";

function CalendarSelectionCheckbox({
  calendar,
  selected,
  onToggle,
}: {
  calendar: WorkspaceCalendar;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <Checkbox
      checked={selected}
      onCheckedChange={onToggle}
      className="h-4.5 w-4.5 cursor-pointer rounded-[5px] border transition-all focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderColor: "var(--input)",
        backgroundColor: selected ? calendar.color : "var(--card)",
        color: readableTextOnColor(calendar.color),
      }}
      aria-label={calendar.name}
    />
  );
}

export function CalendarListItem({
  calendar,
  selected,
  onToggle,
}: {
  calendar: WorkspaceCalendar;
  selected: boolean;
  onToggle: () => void;
}) {

  const updateCalendar = useUpdateCalendar();
  const deleteCalendar = useDeleteCalendar();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const calendarMutationPending =
    updateCalendar.isPending || deleteCalendar.isPending;
  const calendarIdentity = (
    <>
      {calendar.icon && (
        <span className="shrink-0 text-sm leading-none">{calendar.icon}</span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {calendar.name}
      </span>
    </>
  );

  const changeColor = async (color: string) => {
    if (color === calendar.color) return;

    try {
      await updateCalendar.mutateAsync({
        calendarId: calendar.id,
        payload: { color },
      });
    } catch (permissionError) {
      toast.error(getActionErrorMessage(permissionError, "Failed to update calendar"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCalendar.mutateAsync(calendar.id);
      toast.success("Calendar deleted");
      setDeleteModalOpen(false);
    } catch (permissionError) {
      toast.error(getActionErrorMessage(permissionError, "Failed to delete calendar"));
    }
  };

  const saveChanges = async ({
    name,
    icon,
    color,
  }: {
    name: string;
    icon: string | null;
    color: string;
  }) => {
    if (!name) {
      toast.error("Calendar name is required");
      return false;
    }

    if (
      name === calendar.name &&
      icon === calendar.icon &&
      color === calendar.color
    ) {
      return true;
    }

    try {
      await updateCalendar.mutateAsync({
        calendarId: calendar.id,
        payload: { name, icon, color },
      });
      toast.success("Calendar updated");
      return true;
    } catch (permissionError) {
      toast.error(getActionErrorMessage(permissionError, "Failed to update calendar"));
      return false;
    }
  };

  return (
    <>
      <div className="group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted">
        <CalendarSelectionCheckbox
          calendar={calendar}
          selected={selected}
          onToggle={onToggle}
        />

        {calendar.projectId ? (
          <span className="flex min-w-0 flex-1 items-center gap-2.5">{calendarIdentity}</span>
        ) : (
          <Button
          type="button"
          variant="ghost"
          onClick={() => setEditModalOpen(true)}
          disabled={calendarMutationPending}
          aria-label={`Edit calendar ${calendar.name}`}
          aria-expanded={editModalOpen}
          aria-haspopup="dialog"
          className="-my-1 flex h-auto min-w-0 flex-1 justify-start gap-2.5 rounded-control px-0 py-1 text-left hover:bg-transparent focus-visible:ring-inset disabled:opacity-100"
        >
          {calendarIdentity}
          </Button>
        )}

        {calendar.projectId ? (
          <CalendarColorPopover
            value={calendar.color}
            label="Color"
            pending={updateCalendar.isPending}
            triggerClassName="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 focus-visible:opacity-100 transition-opacity"
            onChange={changeColor}
          />
        ) : null}
      </div>

      {!calendar.projectId && editModalOpen && (
        <CalendarModal
          mode="edit"
          initialValues={{
            name: calendar.name,
            icon: calendar.icon,
            color: calendar.color,
          }}
          pending={calendarMutationPending}
          canDelete={!calendar.isDefault}
          onClose={() => setEditModalOpen(false)}
          onRequestDelete={() => setDeleteModalOpen(true)}
          onSave={saveChanges}
        />
      )}

      {!calendar.isDefault && (
        <DeleteCalendarModal
          open={deleteModalOpen}
          calendarName={calendar.name}
          pending={deleteCalendar.isPending}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
