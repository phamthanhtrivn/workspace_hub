"use client";

import React, { useState, useCallback } from "react";
import { Plus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SharePermission } from "../../types/documents.enums";
import { documentsApi } from "../../api/documents.api";

interface ShareModalFormProps {
  documentItemId: string;
  onShareAdded: () => void;
}

export function ShareModalForm({ documentItemId, onShareAdded }: ShareModalFormProps) {
  const [emailInput, setEmailInput] = useState("");
  const [permissionInput, setPermissionInput] = useState<SharePermission>(SharePermission.VIEWER);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddShare = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!emailInput.trim()) return;

      setIsAdding(true);
      try {
        await documentsApi.addShare(documentItemId, emailInput.trim(), permissionInput);
        toast.success(`Đã chia sẻ quyền truy cập với ${emailInput}`);
        setEmailInput("");
        onShareAdded();
      } catch (err: unknown) {
        console.error("Failed to add share", err);
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errMsg = axiosError.response?.data?.message || "Không thể thực hiện chia sẻ";
        toast.error(errMsg);
      } finally {
        setIsAdding(false);
      }
    },
    [documentItemId, emailInput, permissionInput, onShareAdded]
  );

  return (
    <form onSubmit={handleAddShare} className="space-y-2">
      <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
        Chia sẻ với người khác
      </label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="email"
            placeholder="Nhập địa chỉ email..."
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-100 hover:border-slate-200 focus:border-blue-500 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-700 outline-hidden transition-all placeholder:text-slate-400"
          />
        </div>
        <select
          value={permissionInput}
          onChange={(e) => setPermissionInput(e.target.value as SharePermission)}
          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl py-2.5 px-3 text-xs font-black text-slate-700 outline-hidden transition-all cursor-pointer"
        >
          <option value={SharePermission.VIEWER}>Người xem</option>
          <option value={SharePermission.EDITOR}>Người chỉnh sửa</option>
        </select>
        <button
          type="submit"
          disabled={isAdding}
          className="flex items-center justify-center p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
      </div>
    </form>
  );
}
