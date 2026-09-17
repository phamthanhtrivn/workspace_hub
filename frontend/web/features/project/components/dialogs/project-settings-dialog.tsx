"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import {
  ProjectStatus,
  type Project,
  type TaskLabel,
} from "@/features/project/types/project";
import {
  PROJECT_STATUS_SELECT_OPTIONS,
} from "@/features/project/constants/project.constants";
import { ProjectLabelManager } from "../forms/project-label-manager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectSelect } from "../ui/project-form-controls";

export default function ProjectSettingsDialog({
  project,
  open,
  isBusy,
  onClose,
  onSave,
  onArchive,
  canEditProject = true,
  labels = [],
  onCreateLabel,
  onDeleteLabel,
}: {
  project: Project;
  open: boolean;
  isBusy?: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string | null;
    dueDate: string | null;
  }) => Promise<void>;
  onArchive: () => Promise<void>;
  canEditProject?: boolean;
  labels?: TaskLabel[];
  onCreateLabel?: (payload: { name: string; color: string }) => Promise<void>;
  onDeleteLabel?: (labelId: string) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState(project.status);
  const [startDate, setStartDate] = useState(
    project.startDate?.slice(0, 10) || "",
  );
  const [dueDate, setDueDate] = useState(project.dueDate?.slice(0, 10) || "");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEditProject || !name.trim() || isBusy) return;
    if (startDate && dueDate && startDate > dueDate) return;
    await onSave({
      name: name.trim(),
      description: description.trim(),
      status,
      startDate: startDate || null,
      dueDate: dueDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isBusy && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 text-left border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-[#172B4D]">
              {canEditProject ? "Project Settings" : "Project Labels"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-semibold text-slate-500">
              {canEditProject
                ? "Update project details, status, timelines, and manage labels."
                : "Manage custom task tags and labels for this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5 max-h-[calc(100dvh-16rem)] overflow-y-auto">
            {canEditProject && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-slate-600">
                    Start Date
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      max={dueDate || undefined}
                      className="mt-1 h-10 rounded-xl border-slate-200 text-xs font-semibold"
                    />
                  </label>
                  <label className="block text-xs font-bold text-slate-600">
                    Due Date
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      min={startDate || undefined}
                      className="mt-1 h-10 rounded-xl border-slate-200 text-xs font-semibold"
                    />
                  </label>
                </div>
                {startDate && dueDate && startDate > dueDate && (
                  <p className="text-xs font-semibold text-red-600">
                    Start date cannot be after due date.
                  </p>
                )}

                <label className="block text-xs font-bold text-slate-600">
                  Project Name <span className="text-red-500">*</span>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="Project name"
                    className="mt-1 h-10 rounded-xl border-slate-200 text-xs font-semibold"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-600">
                  Description
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="Optional project description..."
                    className="mt-1 resize-none rounded-xl border-slate-200 text-xs font-medium"
                  />
                </label>

                <div>
                  <span className="block mb-1 text-xs font-bold text-slate-600">
                    Status
                  </span>
                  <ProjectSelect
                    value={status}
                    options={PROJECT_STATUS_SELECT_OPTIONS.map((item) => ({
                      value: item.value,
                      label: item.label,
                    }))}
                    onChange={(val) => setStatus(val as ProjectStatus)}
                    ariaLabel="Project status"
                    className="w-full h-10"
                  />
                </div>
              </>
            )}

            {onCreateLabel && (
              <ProjectLabelManager
                labels={labels}
                onCreateLabel={onCreateLabel}
                onDeleteLabel={onDeleteLabel}
              />
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            {canEditProject ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isBusy}
                onClick={() => void onArchive()}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" /> Archive Project
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="cursor-pointer rounded-xl font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              {canEditProject && (
                <Button
                  type="submit"
                  disabled={isBusy || !name.trim()}
                  className="cursor-pointer rounded-xl bg-[#0052CC] font-bold text-white shadow-sm hover:bg-[#0747A6] disabled:opacity-50"
                >
                  {isBusy ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
