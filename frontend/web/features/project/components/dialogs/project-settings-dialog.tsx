"use client";

import { useState } from "react";
import { Archive, X } from "lucide-react";
import {
  ProjectStatus,
  type Project,
  type TaskLabel,
} from "@/features/project/types/project";
import {
  PROJECT_STATUS_SELECT_OPTIONS,
  PROJECT_SETTINGS_LABELS,
} from "@/features/project/constants/project.constants";
import { ProjectLabelManager } from "../forms/project-label-manager";

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

  if (!open) return null;

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-[#172B4D]">
              {canEditProject
                ? PROJECT_SETTINGS_LABELS.TITLE_EDIT
                : PROJECT_SETTINGS_LABELS.TITLE_LABELS_ONLY}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {canEditProject
                ? PROJECT_SETTINGS_LABELS.DESC_EDIT
                : PROJECT_SETTINGS_LABELS.DESC_LABELS_ONLY}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          {canEditProject && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-500">
                  {PROJECT_SETTINGS_LABELS.START_DATE}
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    max={dueDate || undefined}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-500">
                  {PROJECT_SETTINGS_LABELS.DUE_DATE}
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    min={startDate || undefined}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600"
                  />
                </label>
              </div>
              {startDate && dueDate && startDate > dueDate && (
                <p className="text-xs font-semibold text-red-600">
                  {PROJECT_SETTINGS_LABELS.DATE_ERROR}
                </p>
              )}
              <label className="block text-xs font-bold text-slate-500">
                {PROJECT_SETTINGS_LABELS.NAME}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600"
                />
              </label>
              <label className="block text-xs font-bold text-slate-500">
                {PROJECT_SETTINGS_LABELS.DESCRIPTION}
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600"
                />
              </label>
              <label className="block text-xs font-bold text-slate-500">
                {PROJECT_SETTINGS_LABELS.STATUS}
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ProjectStatus)
                  }
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600"
                >
                  {PROJECT_STATUS_SELECT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
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
        <div className="mt-6 flex items-center justify-between gap-2">
          {canEditProject ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void onArchive()}
              className="inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" />{" "}
              {PROJECT_SETTINGS_LABELS.ARCHIVE_BTN}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              {PROJECT_SETTINGS_LABELS.CANCEL_BTN}
            </button>
            {canEditProject && (
              <button
                type="submit"
                disabled={isBusy || !name.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {PROJECT_SETTINGS_LABELS.SAVE_BTN}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
