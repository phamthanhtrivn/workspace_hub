"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2 } from "lucide-react";

interface EditPollModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: {
    title: string;
    multipleChoice: boolean;
    allowAddOptions: boolean;
    anonymous: boolean;
    isLocked?: boolean;
  } | null;
  onSubmit: (data: {
    title: string;
    multipleChoice: boolean;
    allowAddOptions: boolean;
    anonymous: boolean;
    isLocked: boolean;
  }) => void;
}

const EditPollModal: React.FC<EditPollModalProps> = ({
  isOpen,
  onClose,
  poll,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [multipleChoice, setMultipleChoice] = useState(true);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && poll) {
      setTitle(poll.title);
      setMultipleChoice(poll.multipleChoice);
      setAllowAddOptions(poll.allowAddOptions);
      setAnonymous(poll.anonymous ?? false);
      setIsLocked(poll.isLocked ?? false);
    }
  }, [isOpen, poll]);

  if (!isOpen || !poll) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title,
      multipleChoice,
      allowAddOptions,
      anonymous,
      isLocked,
    });
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">
            Chỉnh sửa bình chọn
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Câu hỏi bình chọn
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Đặt câu hỏi..."
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={multipleChoice}
                onChange={(e) => setMultipleChoice(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Chọn nhiều phương án
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAddOptions}
                onChange={(e) => setAllowAddOptions(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700">
                Cho phép người khác thêm phương án
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700">Bình chọn ẩn danh</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 font-medium">
                Khóa bình chọn (Không nhận thêm kết quả)
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 w-full py-2 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default EditPollModal;
