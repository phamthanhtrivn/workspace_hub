"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import { createGroup } from "../../api/chat.api";
import { toast } from "react-toastify";

interface CreateWorkspaceGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (group: any) => void;
}

export default function CreateWorkspaceGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
}: CreateWorkspaceGroupModalProps) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    setIsCreating(true);
    try {
      const response = await createGroup(name.trim());
      if (response && response.data) {
        toast.success("Tạo nhóm thành công!");
        if (onGroupCreated) {
          onGroupCreated(response.data);
        }
        onClose();
      } else {
        toast.error("Không thể tạo nhóm");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi tạo nhóm");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Tạo nhóm mới</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tên nhóm của bạn
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Team Softwaregorup không , Team Marketing, ..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
              className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl text-sm outline-none transition duration-150"
              maxLength={50}
              required
            />
          </div>

          {/* Footer */}
          <div className="mt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-md shadow-blue-100 transition flex items-center gap-1.5 cursor-pointer"
            >
              {isCreating && <Loader2 size={16} className="animate-spin" />}
              Tạo nhóm
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
