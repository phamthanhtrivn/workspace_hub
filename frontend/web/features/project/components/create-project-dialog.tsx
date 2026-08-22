"use client";

import { useState } from "react";
import { Code2, ListTodo, X } from "lucide-react";
import { ProjectTemplate, ProjectType } from "@/features/project/types/project";
import { useAppIntl } from "@/features/i18n/useAppIntl";

const COLOR_OPTIONS = [
  "#6366f1",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#ec4899",
  "#0ea5e9",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

const ICON_OPTIONS = [
  "🚀",
  "📚",
  "📊",
  "💡",
  "🎯",
  "🔧",
  "📝",
  "🎨",
  "⚡",
  "🏆",
  "💼",
  "🎓",
  "🧪",
  "📱",
  "🌐",
  "🔒",
];

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
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label={intl.formatMessage({ id: "app.close" })}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <h2 className="text-lg font-black text-[var(--color-primary-dark)]">
          {intl.formatMessage({ id: "project.create.title" })}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {intl.formatMessage({ id: "project.create.description" })}
        </p>

        <div className="mt-6 space-y-5">
          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-500"
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
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-[var(--color-primary-dark)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:bg-white focus:ring-4 focus:ring-[var(--color-secondary)]/10"
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "project.type" })}
            </label>
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
                    onClick={() => setProjectType(type)}
                    className={[
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition bg-indigo-500 ring-2",
                      selected
                        ? "border-[var(--color-primary-dark)] bg-indigo-50 ring-2 ring-[var(--color-primary-dark)]/10"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        selected
                          ? "bg-[var(--color-primary-dark)] text-white"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        {intl.formatMessage({ id: titleId })}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {intl.formatMessage({ id: descriptionId })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "project.template" })}
            </label>
            <select
              value={template}
              onChange={(event) =>
                setTemplate(event.target.value as ProjectTemplate)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-600"
            >
              <option value={ProjectTemplate.EMPTY}>
                {intl.formatMessage({ id: "project.template.empty" })}
              </option>
              {projectType === ProjectType.SOFTWARE_DEVELOPMENT && (
                <option value={ProjectTemplate.SOFTWARE_SCRUM}>
                  Software Scrum
                </option>
              )}
              <option value={ProjectTemplate.MARKETING_CAMPAIGN}>
                {intl.formatMessage({
                  id: "project.template.marketingCampaign",
                })}
              </option>
              <option value={ProjectTemplate.EVENT_PLAN}>
                {intl.formatMessage({ id: "project.template.eventPlan" })}
              </option>
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              {intl.formatMessage({ id: "project.templateDescription" })}
            </p>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "project.icon" })}
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={[
                    "grid h-10 w-10 place-items-center rounded-xl text-lg transition",
                    selectedIcon === icon
                      ? "bg-[var(--color-primary-dark)] shadow-lg ring-2 ring-[var(--color-primary-dark)] ring-offset-2"
                      : "bg-slate-100 hover:bg-slate-200",
                  ].join(" ")}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {intl.formatMessage({ id: "project.color" })}
            </label>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={[
                    "h-8 w-8 rounded-full transition",
                    selectedColor === color
                      ? "ring-2 ring-offset-2 scale-110"
                      : "hover:scale-110",
                  ].join(" ")}
                  style={{
                    backgroundColor: color,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {intl.formatMessage({ id: "project.preview" })}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className="grid h-11 w-11 place-items-center rounded-xl text-lg shadow-sm ring-1 ring-slate-200"
                style={{ backgroundColor: `${selectedColor}14` }}
              >
                {selectedIcon}
              </span>
              <span className="text-sm font-black text-[var(--color-primary-dark)]">
                {name || intl.formatMessage({ id: "project.nameFallback" })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="rounded-xl bg-[var(--color-primary-dark)] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary-dark)]/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {intl.formatMessage({ id: "project.create.submit" })}
          </button>
        </div>
      </div>
    </div>
  );
}
