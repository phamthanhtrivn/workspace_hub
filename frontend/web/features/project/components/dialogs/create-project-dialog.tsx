"use client";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";


import { useState } from "react";
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
import type { CreateProjectPayload } from "@/features/project/api/project.api";
import {
  PROJECT_COLOR_OPTIONS,
  PROJECT_ICON_OPTIONS,
} from "@/features/project/constants/project-form.constants";
import { getTodayDateValue } from "@/features/project/utils/project-date.utils";
import ProjectPreviewCard from "../ui/project-preview-card";
import { cn } from "@/lib/utils";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (payload: CreateProjectPayload) => Promise<void>;
  isSubmitting?: boolean;
}

export default function CreateProjectDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(getTodayDateValue);
  const [dueDate, setDueDate] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(
    PROJECT_COLOR_OPTIONS[0],
  );
  const [selectedIcon, setSelectedIcon] = useState<string>(
    PROJECT_ICON_OPTIONS[0],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || isSubmitting) return;
    if (startDate && dueDate && startDate > dueDate) return;

    await onSubmit?.({
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon,
      description: description.trim() || undefined,
      startDate: startDate || null,
      dueDate: dueDate || null,
    });

    setName("");
    setDescription("");
    setStartDate(getTodayDateValue());
    setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-dialog border-border bg-card text-foreground sm:rounded-dialog">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 text-left border-b border-border">
            <DialogTitle className="text-section-title font-semibold tracking-tight text-foreground">
              Create Project
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Set up a new workspace project to manage tasks and collaborate with your team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5 max-h-[calc(100dvh-16rem)] overflow-y-auto">
            <ProjectPreviewCard
              name={name}
              description={description}
              icon={selectedIcon}
              color={selectedColor}
            />

            {/* Project Name */}
            <div>
              <label
                htmlFor="project-name"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Project Name <span className="text-destructive-content">*</span>
              </label>
              <Input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name..."
                autoFocus
                required
                className="mt-2 h-11 w-full rounded-control border-input bg-card px-3 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Description <span className="font-semibold normal-case text-muted-foreground">(Optional)</span>
              </label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Describe the project goals or scope..."
                className="mt-2 min-h-24 resize-none rounded-control border-input bg-card text-sm text-foreground placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  htmlFor="project-start-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Start Date <span className="font-semibold normal-case text-muted-foreground">(Optional)</span>
                  <CustomDatePicker
                    disabled={isSubmitting}
                    id="project-start-date"
                    value={startDate}
                    onChange={nextValue => setStartDate(nextValue)}
                    max={dueDate || undefined}
                    triggerClassName="mt-2 h-11 rounded-control border-input bg-card text-sm font-semibold text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    ariaLabel="Start date"
                    allowClear
                  />
                </label>
                <label
                  htmlFor="project-due-date"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  End Date <span className="font-semibold normal-case text-muted-foreground">(Optional)</span>
                  <CustomDatePicker
                    disabled={isSubmitting}
                    id="project-due-date"
                    value={dueDate}
                    onChange={nextValue => setDueDate(nextValue)}
                    min={startDate || undefined}
                    triggerClassName="mt-2 h-11 rounded-control border-input bg-card text-sm font-semibold text-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
                    ariaLabel="End date"
                    allowClear
                  />
                </label>
              </div>
              {startDate && dueDate && startDate > dueDate ? (
                <p className="mt-2 text-xs font-semibold text-destructive-content">
                  Start date cannot be after end date.
                </p>
              ) : null}
            </div>

            {/* Icon Picker */}
            <fieldset>
              <legend className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        "h-9 w-9 cursor-pointer rounded-control border text-base transition duration-150 p-0",
                        selected
                          ? "border-primary bg-primary-soft ring-1 ring-primary/20 hover:bg-primary-soft"
                          : "border-transparent bg-muted hover:border-input hover:bg-accent"
                      )}
                    >
                      {icon}
                    </Button>
                  );
                })}
              </div>
            </fieldset>

            {/* Color Picker */}
            <fieldset>
              <legend className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        "h-8 w-8 cursor-pointer rounded-full border-2 border-border transition duration-150 p-0",
                        selected
                          ? "scale-110"
                          : ""
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

          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t border-border bg-background px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-control border-border font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !name.trim() ||
                isSubmitting ||
                Boolean(startDate && dueDate && startDate > dueDate)
              }
              className="cursor-pointer rounded-control bg-primary font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
