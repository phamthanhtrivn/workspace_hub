"use client";

import { useState } from "react";
import { X } from "lucide-react";

const COLOR_OPTIONS = [
  "#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#ec4899",
  "#0ea5e9", "#8b5cf6", "#14b8a6", "#f97316", "#64748b",
];

const ICON_OPTIONS = [
  "🚀", "📚", "📊", "💡", "🎯", "🔧", "📝", "🎨", "⚡", "🏆",
  "💼", "🎓", "🧪", "📱", "🌐", "🔒",
];

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateProjectDialog({
  open,
  onClose,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);

  if (!open) return null;

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
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <h2 className="text-lg font-black text-[var(--color-primary-dark)]">
          Tạo dự án mới
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Thiết lập dự án để bắt đầu quản lý công việc của bạn.
        </p>

        <div className="mt-6 space-y-5">
          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Tên dự án
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: WorkspaceHub Platform"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-[var(--color-primary-dark)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-secondary)] focus:bg-white focus:ring-4 focus:ring-[var(--color-secondary)]/10"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Icon
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
              Màu sắc
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
                    ringColor: selectedColor === color ? color : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Preview
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className="grid h-11 w-11 place-items-center rounded-xl text-lg shadow-sm ring-1 ring-slate-200"
                style={{ backgroundColor: `${selectedColor}14` }}
              >
                {selectedIcon}
              </span>
              <span className="text-sm font-black text-[var(--color-primary-dark)]">
                {name || "Tên dự án"}
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
            Hủy
          </button>
          <button
            onClick={onClose}
            disabled={!name.trim()}
            className="rounded-xl bg-[var(--color-primary-dark)] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--color-primary-dark)]/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tạo dự án
          </button>
        </div>
      </div>
    </div>
  );
}
