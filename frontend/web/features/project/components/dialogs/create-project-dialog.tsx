"use client";

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
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white text-slate-800 shadow-2xl sm:rounded-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 text-left border-b border-slate-100">
            <DialogTitle className="text-xl font-bold tracking-tight text-[#172B4D]">
              Create Project
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-[#42526E]">
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
                className="block text-xs font-bold uppercase tracking-wider text-[#42526E]"
              >
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name..."
                autoFocus
                required
                className="mt-2 h-11 w-full rounded-xl border-slate-300 bg-white px-3 text-sm font-semibold text-[#172B4D] placeholder:font-normal placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
              />
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="block text-xs font-bold uppercase tracking-wider text-[#42526E]"
              >
                Description <span className="font-semibold normal-case text-slate-400">(Optional)</span>
              </label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Describe the project goals or scope..."
                className="mt-2 min-h-24 resize-none rounded-xl border-slate-300 bg-white text-sm text-[#172B4D] placeholder:font-normal placeholder:text-slate-400 focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
              />
            </div>

            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  htmlFor="project-start-date"
                  className="block text-xs font-bold uppercase tracking-wider text-[#42526E]"
                >
                  Start Date <span className="font-semibold normal-case text-slate-400">(Optional)</span>
                  <Input
                    id="project-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    max={dueDate || undefined}
                    className="mt-2 h-11 rounded-xl border-slate-300 bg-white text-sm font-semibold text-[#172B4D] focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
                  />
                </label>
                <label
                  htmlFor="project-due-date"
                  className="block text-xs font-bold uppercase tracking-wider text-[#42526E]"
                >
                  End Date <span className="font-semibold normal-case text-slate-400">(Optional)</span>
                  <Input
                    id="project-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    min={startDate || undefined}
                    className="mt-2 h-11 rounded-xl border-slate-300 bg-white text-sm font-semibold text-[#172B4D] focus-visible:border-[#0052CC] focus-visible:ring-2 focus-visible:ring-[#0052CC]/15"
                  />
                </label>
              </div>
              {startDate && dueDate && startDate > dueDate ? (
                <p className="mt-2 text-xs font-semibold text-red-600">
                  Start date cannot be after end date.
                </p>
              ) : null}
            </div>

            {/* Icon Picker */}
            <fieldset>
              <legend className="block text-xs font-bold uppercase tracking-wider text-[#42526E]">
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
                        "h-9 w-9 cursor-pointer rounded-xl border text-base transition duration-150 p-0",
                        selected
                          ? "border-[#0052CC] bg-[#E8F0FE] shadow-sm ring-1 ring-[#0052CC]/20 hover:bg-[#E8F0FE]"
                          : "border-transparent bg-slate-100 hover:border-slate-300 hover:bg-slate-200"
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
              <legend className="block text-xs font-bold uppercase tracking-wider text-[#42526E]">
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
                        "h-8 w-8 cursor-pointer rounded-full border-2 border-white shadow-sm transition duration-150 p-0",
                        selected
                          ? "scale-110 hover:scale-110"
                          : "hover:scale-105 hover:shadow-md"
                      )}
                      style={{
                        backgroundColor: color,
                        boxShadow: selected
                          ? `0 0 0 2px #ffffff, 0 0 0 4px ${color}`
                          : undefined,
                      }}
                    />
                  );
                })}
              </div>
            </fieldset>

          </div>

          <DialogFooter className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-xl border-slate-200 font-bold text-[#42526E] hover:bg-slate-100"
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
              className="cursor-pointer rounded-xl bg-[#0052CC] font-bold text-white shadow-sm hover:bg-[#0747A6] disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
