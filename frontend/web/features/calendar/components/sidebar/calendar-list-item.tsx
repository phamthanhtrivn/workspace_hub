"use client";

import { MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
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
      className="h-4.5 w-4.5 cursor-pointer rounded-[5px] border transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500/40"
      style={{
        borderColor: calendar.color,
        backgroundColor: selected ? calendar.color : "#ffffff",
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

  const changeColor = async (color: string) => {
    if (color === calendar.color) return;

    try {
      await updateCalendar.mutateAsync({
        calendarId: calendar.id,
        payload: { color },
      });
    } catch {
      toast.error("Failed to update calendar");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCalendar.mutateAsync(calendar.id);
      toast.success("Calendar deleted");
      setDeleteModalOpen(false);
    } catch {
      toast.error("Failed to delete calendar");
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
    } catch {
      toast.error("Failed to update calendar");
      return false;
    }
  };

  return (
    <>
      <div className="group relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100/70">
        <CalendarSelectionCheckbox
          calendar={calendar}
          selected={selected}
          onToggle={onToggle}
        />

        {calendar.icon && (
          <span className="shrink-0 text-sm leading-none">{calendar.icon}</span>
        )}

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 select-none">
          {calendar.name}
        </span>

        {calendar.projectId ? (
          <CalendarColorPopover
            value={calendar.color}
            label="Color"
            pending={updateCalendar.isPending}
            triggerClassName="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            onChange={changeColor}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditModalOpen(true)}
            className={cn(
              "grid h-6 w-6 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
              editModalOpen && "bg-slate-100 text-slate-700",
            )}
            aria-expanded={editModalOpen}
            aria-haspopup="dialog"
            aria-label="Edit calendar"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        )}
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
