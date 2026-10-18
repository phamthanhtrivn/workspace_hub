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
import {
  PROJECT_COLOR_OPTIONS,
  PROJECT_ICON_OPTIONS,
} from "@/features/project/constants/project-form.constants";
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
import ProjectPreviewCard from "../ui/project-preview-card";
import { cn } from "@/lib/utils";

export default function ProjectSettingsDialog({
  project,
  open,
  isBusy,
  onClose,
  onSave,
  onArchive,
  canEditProject = true,
  showLabelManager = false,
  labels = [],
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}: {
  project: Project;
  open: boolean;
  isBusy?: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    color: string;
    icon: string;
    description: string;
    status: ProjectStatus;
    startDate: string | null;
    dueDate: string | null;
  }) => Promise<void>;
  onArchive: () => Promise<void>;
  canEditProject?: boolean;
  showLabelManager?: boolean;
  labels?: TaskLabel[];
  onCreateLabel?: (payload: { name: string; color: string }) => Promise<void>;
  onUpdateLabel?: (
    labelId: string,
    payload: { name: string; color: string },
  ) => Promise<void>;
  onDeleteLabel?: (labelId: string) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [selectedColor, setSelectedColor] = useState(project.color);
  const [selectedIcon, setSelectedIcon] = useState(project.icon);
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
      color: selectedColor,
      icon: selectedIcon,
      description: description.trim(),
      status,
      startDate: startDate || null,
      dueDate: dueDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isBusy && onClose()}>
      <DialogContent className="flex max-w-lg flex-col p-0 gap-0 overflow-hidden rounded-dialog border-border bg-card sm:rounded-dialog">
        <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 max-h-[inherit] flex-col">
          <DialogHeader className="shrink-0 px-5 pt-5 pb-4 pr-12 text-left border-b border-border">
            <DialogTitle className="text-section-title font-semibold text-foreground">
              {canEditProject ? "Project Settings" : "Project Labels"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-semibold text-muted-foreground">
              {canEditProject
                ? "Update project details, status, timelines, and manage labels."
                : "Manage custom task tags and labels for this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 px-5 py-5 overflow-y-auto">
            <ProjectPreviewCard
              name={name}
              description={description}
              icon={selectedIcon}
              color={selectedColor}
              fallbackName={project.name || "Untitled Project"}
            />

            {canEditProject && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Start Date
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      max={dueDate || undefined}
                      className="mt-1 h-10 rounded-control border-input text-xs font-semibold"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Due Date
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      min={startDate || undefined}
                      className="mt-1 h-10 rounded-control border-input text-xs font-semibold"
                    />
                  </label>
                </div>
                {startDate && dueDate && startDate > dueDate && (
                  <p className="text-xs font-semibold text-destructive-content">
                    Start date cannot be after due date.
                  </p>
                )}

                <label className="block text-xs font-semibold text-muted-foreground">
                  Project Name <span className="text-destructive-content">*</span>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    placeholder="Project name"
                    className="mt-1 h-10 rounded-control border-input text-xs font-semibold"
                  />
                </label>

                <label className="block text-xs font-semibold text-muted-foreground">
                  Description
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="Optional project description..."
                    className="mt-1 resize-none rounded-control border-input text-xs font-medium"
                  />
                </label>

                <fieldset>
                  <legend className="block text-xs font-semibold text-muted-foreground">
                    Project Icon
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PROJECT_ICON_OPTIONS.map((icon) => {
                      const selected = selectedIcon === icon;

                      return (
                        <Button
                          key={icon}
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Project icon: ${icon}`}
                          aria-pressed={selected}
                          onClick={() => setSelectedIcon(icon)}
                          className={cn(
                            "h-9 w-9 cursor-pointer rounded-control border p-0 text-base transition duration-150",
                            selected
                              ? "border-primary bg-primary-soft ring-1 ring-primary/20 hover:bg-primary-soft"
                              : "border-transparent bg-muted hover:border-input hover:bg-accent",
                          )}
                        >
                          {icon}
                        </Button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="block text-xs font-semibold text-muted-foreground">
                    Theme Color
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    {PROJECT_COLOR_OPTIONS.map((color) => {
                      const selected = selectedColor === color;

                      return (
                        <Button
                          key={color}
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Project color: ${color}`}
                          aria-pressed={selected}
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "h-8 w-8 cursor-pointer rounded-full border-2 border-border p-0 transition duration-150",
                            selected
                              ? "scale-110"
                              : "",
                          )}
                          style={{
                            backgroundColor: color,
                            boxShadow: selected
                              ? `0 0 0 2px var(--card), 0 0 0 4px var(--ring)`
                              : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                </fieldset>

                <div>
                  <span className="block mb-1 text-xs font-semibold text-muted-foreground">
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

            {showLabelManager ? (
              <ProjectLabelManager
                labels={labels}
                onCreateLabel={onCreateLabel}
                onUpdateLabel={onUpdateLabel}
                onDeleteLabel={onDeleteLabel}
              />
            ) : null}
          </div>

          <DialogFooter className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-5 py-4">
            {canEditProject ? (
              <Button
                type="button"
                variant="ghost"
                disabled={isBusy}
                onClick={() => void onArchive()}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-control px-3 text-xs font-semibold text-destructive-content hover:bg-destructive-soft hover:text-destructive-content disabled:opacity-50"
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
                className="cursor-pointer rounded-control font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              {canEditProject && (
                <Button
                  type="submit"
                  disabled={isBusy || !name.trim()}
                  className="cursor-pointer rounded-control bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
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
