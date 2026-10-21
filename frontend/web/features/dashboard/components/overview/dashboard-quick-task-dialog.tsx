"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarTaskDeadlineFields } from "@/features/calendar/components/modal/calendar-task-deadline-fields";
import { CalendarTaskTitleField } from "@/features/calendar/components/modal/calendar-task-title-field";
import type { CalendarTaskDeadline } from "@/features/calendar/types/calendar.types";
import { dashboardQuickTaskSchema } from "../../schemas/dashboard-quick-task.schema";
import { useDashboardQuickTask } from "../../hooks/use-dashboard-quick-task";

export default function DashboardQuickTaskDialog({ zone, onClose, onCreated }: { zone: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState<CalendarTaskDeadline>({ enabled: false, date: "", time: "" });
  const [validationErrors, setValidationErrors] = useState<{ title?: string; deadline?: string }>({});
  const { createTask, isPending, error } = useDashboardQuickTask(zone, onCreated);
  const close = () => { if (!isPending) onClose(); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = dashboardQuickTaskSchema.safeParse({ title, deadline });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setValidationErrors({ title: errors.title?.[0], deadline: errors.deadline?.[0] });
      return;
    }
    setValidationErrors({});
    void createTask(parsed.data);
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }} closeOnEscape={!isPending} closeOnOutsideClick={!isPending}>
      <DialogContent showCloseButton={!isPending} className="flex flex-col">
        <DialogHeader className="pr-14">
          <DialogTitle>Create a task</DialogTitle>
          <DialogDescription>Add a personal task to My tasks and today’s schedule. Set a deadline if needed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-col" aria-busy={isPending}>
          <fieldset disabled={isPending} className="min-h-0 min-w-0 space-y-4 overflow-y-auto px-5 pb-5">
            <CalendarTaskTitleField value={title} onChange={(event) => { setTitle(event.target.value); setValidationErrors((errors) => ({ ...errors, title: undefined })); }}
              data-modal-initial-focus wrapperClassName="ml-12" error={validationErrors.title} />
            <CalendarTaskDeadlineFields value={deadline} error={validationErrors.deadline} disabled={isPending}
              onChange={(value) => { setDeadline(value); setValidationErrors((errors) => ({ ...errors, deadline: undefined })); }} />
          </fieldset>
          {error && <p role="alert" className="px-5 pb-4 text-sm text-destructive-content">{error}</p>}
          <DialogFooter className="flex-wrap">
            <Button type="button" variant="outline" disabled={isPending} onClick={close} className="min-h-11">Cancel</Button>
            <Button type="submit" disabled={isPending} className="min-h-11"><Plus aria-hidden className="size-4" />{isPending ? "Creating…" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
