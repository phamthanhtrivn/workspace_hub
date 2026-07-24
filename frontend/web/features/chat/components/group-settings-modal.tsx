import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiCheck,
  FiMessageSquare,
  FiPaperclip,
  FiBarChart2,
  FiEdit3,
} from "react-icons/fi";
import { updateConversationSettings } from "../api/chat.api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface GroupSettingsModalProps {
  conversation: any;
  onClose: () => void;
}

export default function GroupSettingsModal({
  conversation,
  onClose,
}: GroupSettingsModalProps) {
  const [settings, setSettings] = useState({
    allowSendMessage: conversation.setting?.allowSendMessage ?? true,
    allowPinMessage: conversation.setting?.allowPinMessage ?? true,
    allowCreatePoll: conversation.setting?.allowCreatePoll ?? true,
    allowCreateNote: conversation.setting?.allowCreateNote ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConversationSettings(conversation.id, settings);
      toast.success("Cập nhật cài đặt thành công");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
    } catch (error) {
      toast.error("Không thể cập nhật cài đặt nhóm");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
            Cài đặt nhóm
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-2.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-5 bg-gray-50/50">
          <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
            <SettingItem
              title="Cho phép nhắn tin"
              description="Thành viên có thể gửi tin nhắn vào nhóm"
              checked={settings.allowSendMessage}
              onChange={() => handleToggle("allowSendMessage")}
              icon={<FiMessageSquare size={18} />}
            />
            <SettingItem
              title="Cho phép ghim tin nhắn"
              description="Thành viên có thể ghim/bỏ ghim tin nhắn"
              checked={settings.allowPinMessage}
              onChange={() => handleToggle("allowPinMessage")}
              icon={<FiPaperclip size={18} />}
            />
            <SettingItem
              title="Cho phép tạo bình chọn"
              description="Thành viên có thể tạo bình chọn mới"
              checked={settings.allowCreatePoll}
              onChange={() => handleToggle("allowCreatePoll")}
              icon={<FiBarChart2 size={18} />}
            />
            <SettingItem
              title="Cho phép tạo ghi chú"
              description="Thành viên có thể tạo ghi chú mới"
              checked={settings.allowCreateNote}
              onChange={() => handleToggle("allowCreateNote")}
              icon={<FiEdit3 size={18} />}
            />
          </div>
        </div>

        <div className="flex justify-end p-5 border-t border-gray-100 gap-3 bg-gray-50/80">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
          >
            {isSaving ? (
              "Đang lưu..."
            ) : (
              <>
                <FiCheck size={18} />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SettingItem({
  title,
  description,
  checked,
  onChange,
  icon,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
