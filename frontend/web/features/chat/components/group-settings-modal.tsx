import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiX, FiCheck } from "react-icons/fi";
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Cài đặt nhóm</h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <SettingItem
            title="Cho phép nhắn tin"
            description="Thành viên có thể gửi tin nhắn vào nhóm"
            checked={settings.allowSendMessage}
            onChange={() => handleToggle("allowSendMessage")}
          />
          <SettingItem
            title="Cho phép ghim tin nhắn"
            description="Thành viên có thể ghim/bỏ ghim tin nhắn"
            checked={settings.allowPinMessage}
            onChange={() => handleToggle("allowPinMessage")}
          />
          <SettingItem
            title="Cho phép tạo bình chọn"
            description="Thành viên có thể tạo bình chọn mới"
            checked={settings.allowCreatePoll}
            onChange={() => handleToggle("allowCreatePoll")}
          />
          <SettingItem
            title="Cho phép tạo ghi chú"
            description="Thành viên có thể tạo ghi chú mới"
            checked={settings.allowCreateNote}
            onChange={() => handleToggle("allowCreateNote")}
          />
        </div>

        <div className="flex justify-end p-5 border-t border-gray-100 gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
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
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-medium text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
