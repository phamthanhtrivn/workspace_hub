"use client";

import { useState } from "react";
import { Archive, X } from "lucide-react";
import { ProjectStatus, type Project, type TaskLabel } from "@/types/project";

export default function ProjectSettingsDialog({
  project,
  open,
  isBusy,
  onClose,
  onSave,
  onArchive,
  labels = [],
  onCreateLabel,
  onDeleteLabel,
}: {
  project: Project;
  open: boolean;
  isBusy?: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; description: string; status: ProjectStatus; startDate: string | null; dueDate: string | null }) => Promise<void>;
  onArchive: () => Promise<void>;
  labels?: TaskLabel[];
  onCreateLabel?: (payload: { name: string; color: string }) => Promise<void>;
  onDeleteLabel?: (labelId: string) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState(project.status);
  const [startDate, setStartDate] = useState(project.startDate?.slice(0, 10) || "");
  const [dueDate, setDueDate] = useState(project.dueDate?.slice(0, 10) || "");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#0052CC");

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || isBusy) return;
    if (startDate && dueDate && startDate > dueDate) return;
    await onSave({ name: name.trim(), description: description.trim(), status, startDate: startDate || null, dueDate: dueDate || null });
  };

  const handleCreateLabel = async () => {
    if (!labelName.trim() || !onCreateLabel) return;
    await onCreateLabel({ name: labelName.trim(), color: labelColor });
    setLabelName("");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
      <form onSubmit={(event) => void handleSubmit(event)} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-[#172B4D]">Cài đặt Project</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">Cập nhật thông tin và trạng thái Project.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-500">Ngày bắt đầu<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} max={dueDate || undefined} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600" /></label>
            <label className="block text-xs font-bold text-slate-500">Ngày kết thúc dự kiến<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} min={startDate || undefined} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600" /></label>
          </div>
          {startDate && dueDate && startDate > dueDate && <p className="text-xs font-semibold text-red-600">Ngày bắt đầu không được sau ngày kết thúc.</p>}
          <label className="block text-xs font-bold text-slate-500">Tên Project<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600" /></label>
          <label className="block text-xs font-bold text-slate-500">Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="mt-1 w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600" /></label>
          <label className="block text-xs font-bold text-slate-500">Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-600">
            <option value={ProjectStatus.ACTIVE}>Đang hoạt động</option>
            <option value={ProjectStatus.ON_HOLD}>Tạm dừng</option>
            <option value={ProjectStatus.COMPLETED}>Đã hoàn thành</option>
          </select></label>
          {onCreateLabel && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-600">Nhãn của Project</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {labels.map((label) => (
                  <span key={label.id} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white" style={{ backgroundColor: label.color }}>
                    {label.name}
                    {onDeleteLabel && <button type="button" onClick={() => void onDeleteLabel(label.id)} className="opacity-80 hover:opacity-100" aria-label={`Xóa ${label.name}`}>×</button>}
                  </span>
                ))}
                {labels.length === 0 && <span className="text-[11px] text-slate-400">Chưa có label.</span>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input value={labelName} onChange={(event) => setLabelName(event.target.value)} placeholder="Tên label" maxLength={50} className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-600" />
                <input type="color" value={labelColor} onChange={(event) => setLabelColor(event.target.value)} className="h-8 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5" aria-label="Màu label" />
                <button type="button" onClick={() => void handleCreateLabel()} disabled={!labelName.trim()} className="rounded bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Thêm</button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between gap-2">
          <button type="button" disabled={isBusy} onClick={() => void onArchive()} className="inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><Archive className="h-3.5 w-3.5" /> Archive Project</button>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Hủy</button><button type="submit" disabled={isBusy || !name.trim()} className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Lưu thay đổi</button></div>
        </div>
      </form>
    </div>
  );
}
