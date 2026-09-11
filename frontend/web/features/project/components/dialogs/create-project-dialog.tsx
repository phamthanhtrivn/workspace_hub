"use client";

import { useState } from "react";
import { Code2, ListTodo, X } from "lucide-react";
import { ProjectTemplate, ProjectType } from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  PROJECT_COLOR_OPTIONS,
  PROJECT_ICON_OPTIONS,
} from "@/features/project/constants/project-form.constants";
import { PROJECT_TEMPLATE_OPTIONS } from "@/features/project/constants/project.constants";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (payload: {
    name: string;
    color: string;
    icon: string;
    projectType: ProjectType;
    template?: ProjectTemplate;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function CreateProjectDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateProjectDialogProps) {
  const intl = useAppIntl();
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(
    PROJECT_COLOR_OPTIONS[0],
  );
  const [selectedIcon, setSelectedIcon] = useState<string>(
    PROJECT_ICON_OPTIONS[0],
  );
  const [projectType, setProjectType] = useState(ProjectType.GENERAL);
  const [template, setTemplate] = useState(ProjectTemplate.EMPTY);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim() || isSubmitting) return;

    await onSubmit?.({
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon,
      projectType,
      template,
    });

    setName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        aria-describedby="create-project-description"
        aria-busy={isSubmitting}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_24px_70px_-24px_rgba(15,40,84,0.38)] animate-in zoom-in-95 fade-in duration-200 sm:max-h-[calc(100dvh-2rem)]"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={intl.formatMessage({ id: "app.close" })}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="shrink-0 px-6 pb-4 pr-14 pt-5">
          <h2
            id="create-project-title"
            className="text-xl font-bold tracking-tight text-[#172B4D]"
          >
            {intl.formatMessage({ id: "project.create.title" })}
          </h2>
          <p
            id="create-project-description"
            className="mt-1 text-sm leading-5 text-[#42526E]"
          >
            {intl.formatMessage({ id: "project.create.description" })}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 pb-5 pt-1">
          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-xs font-bold uppercase tracking-wider text-[#42526E]"
            >
              {intl.formatMessage({ id: "project.name" })}
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={intl.formatMessage({
                id: "project.namePlaceholder",
              })}
              autoFocus
              className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-[#172B4D] outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/15"
            />
          </div>

          {/* Project Type */}
          <fieldset>
            <legend className="block text-xs font-bold uppercase tracking-wider text-[#42526E]">
              {intl.formatMessage({ id: "project.type" })}
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {[
                {
                  type: ProjectType.GENERAL,
                  titleId: "project.type.general",
                  descriptionId: "project.type.generalDescription",
                  Icon: ListTodo,
                },
                {
                  type: ProjectType.SOFTWARE_DEVELOPMENT,
                  titleId: "project.type.software",
                  descriptionId: "project.type.softwareDescription",
                  Icon: Code2,
                },
              ].map(({ type, titleId, descriptionId, Icon }) => {
                const selected = projectType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setProjectType(type)}
                    className={[
                      "flex min-h-20 items-start gap-3 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2",
                      selected
                        ? "border-[#0052CC] bg-[#E8F0FE] ring-1 ring-[#0052CC]/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        selected
                          ? "bg-[#0052CC] text-white"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-[#172B4D]">
                        {intl.formatMessage({ id: titleId })}
                      </span>
                      <span className="mt-0.5 block text-xs leading-[1.125rem] text-[#42526E]">
                        {intl.formatMessage({ id: descriptionId })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Template */}
          <div>
            <label
              htmlFor="project-template"
              className="block text-xs font-bold uppercase tracking-wider text-[#42526E]"
            >
              {intl.formatMessage({ id: "project.template" })}
            </label>
            <select
              id="project-template"
              value={template}
              onChange={(event) =>
                setTemplate(event.target.value as ProjectTemplate)
              }
              className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-[#172B4D] outline-none transition hover:border-slate-400 focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/15"
            >
              {PROJECT_TEMPLATE_OPTIONS.filter(
                (item) =>
                  !("softwareOnly" in item) ||
                  !item.softwareOnly ||
                  projectType === ProjectType.SOFTWARE_DEVELOPMENT,
              ).map((item) => (
                <option key={item.value} value={item.value}>
                  {intl.formatMessage({ id: item.labelId })}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-4 text-slate-500">
              {intl.formatMessage({ id: "project.templateDescription" })}
            </p>
          </div>

          {/* Icon Picker */}
          <fieldset>
            <legend className="block text-xs font-bold uppercase tracking-wider text-[#42526E]">
              {intl.formatMessage({ id: "project.icon" })}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PROJECT_ICON_OPTIONS.map((icon) => {
                const selected = selectedIcon === icon;

                return (
                  <button
                    key={icon}
                    type="button"
                    aria-label={`${intl.formatMessage({ id: "project.icon" })}: ${icon}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedIcon(icon)}
                    className={[
                      "grid h-9 w-9 place-items-center rounded-lg border text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2",
                      selected
                        ? "border-[#0052CC] bg-[#E8F0FE] shadow-sm ring-1 ring-[#0052CC]/20"
                        : "border-transparent bg-slate-100 hover:border-slate-300 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Color Picker */}
          <fieldset>
            <legend className="block text-xs font-bold uppercase tracking-wider text-[#42526E]">
              {intl.formatMessage({ id: "project.color" })}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {PROJECT_COLOR_OPTIONS.map((color) => {
                const selected = selectedColor === color;

                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`${intl.formatMessage({ id: "project.color" })}: ${color}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedColor(color)}
                    className={[
                      "h-8 w-8 rounded-full border-2 border-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2",
                      selected
                        ? "scale-110 ring-2 ring-[#0F2854] ring-offset-2"
                        : "hover:scale-105 hover:shadow-md",
                    ].join(" ")}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
          </fieldset>

          {/* Preview */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {intl.formatMessage({ id: "project.preview" })}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className="grid h-10 w-10 place-items-center rounded-lg text-lg shadow-sm ring-1 ring-slate-200"
                style={{ backgroundColor: `${selectedColor}14` }}
              >
                {selectedIcon}
              </span>
              <span className="min-w-0 truncate text-sm font-bold text-[#172B4D]">
                {name || intl.formatMessage({ id: "project.nameFallback" })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-bold text-[#42526E] transition hover:bg-slate-200/70 hover:text-[#172B4D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="rounded-lg bg-[#0052CC] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0747A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
          >
            {intl.formatMessage({ id: "project.create.submit" })}
          </button>
        </div>
      </form>
    </div>
  );
}
