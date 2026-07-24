import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiCheck,
  FiMessageSquare,
  FiPaperclip,
  FiBarChart2,
  FiEdit3,
  FiCamera,
  FiLoader,
} from "react-icons/fi";
import {
  updateConversationSettings,
  getGroupAvatarPresignedUrl,
  updateGroupInfo,
} from "../api/chat.api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { Users } from "lucide-react";
import axios from "axios";

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
  const [groupName, setGroupName] = useState(conversation.name || "");
  const [groupAvatar, setGroupAvatar] = useState(conversation.avatarUrl || "");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const currentMember = conversation.members?.find(
    (m: any) => m.userId === currentUserId,
  );
  const isOwner = currentMember?.role === "OWNER";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const response = await getGroupAvatarPresignedUrl(
        conversation.id,
        file.name,
        file.type,
      );
      if (response && response.success) {
        const { presignedUrl, fileUrl } = response.data;

        await axios.put(presignedUrl, file, {
          headers: {
            "Content-Type": file.type,
          },
        });

        setGroupAvatar(fileUrl);
        toast.success(
          "Tải ảnh đại diện tạm thời thành công. Nhấn Lưu để hoàn tất.",
        );
      } else {
        toast.error("Không thể lấy link tải ảnh");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tải ảnh lên");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save settings
      await updateConversationSettings(conversation.id, settings);

      // 2. If owner, save name and avatarUrl if they changed
      if (isOwner) {
        const trimmedName = groupName.trim();
        if (
          trimmedName !== (conversation.name || "") ||
          groupAvatar !== (conversation.avatarUrl || "")
        ) {
          if (!trimmedName) {
            toast.error("Tên nhóm không được để trống");
            setIsSaving(false);
            return;
          }
          await updateGroupInfo(conversation.id, trimmedName, groupAvatar || undefined);
        }
      }

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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white shrink-0">
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

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Group Info Section */}
          <div className="p-5 bg-gray-50/50 flex flex-col gap-4 border-b border-gray-100">
            {isOwner ? (
              <div className="flex flex-col items-center gap-4">
                {/* Avatar Upload */}
                <div className="relative group w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm shrink-0">
                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      <FiLoader className="animate-spin h-6 w-6" />
                    </div>
                  ) : (
                    <>
                      {groupAvatar ? (
                        <img
                          src={groupAvatar}
                          alt="Group Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users size={32} className="text-gray-400" />
                      )}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full cursor-pointer"
                        disabled={isSaving}
                      >
                        <FiCamera className="h-6 w-6" />
                      </button>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Group Name input */}
                <div className="w-full">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                    Tên nhóm
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Nhập tên nhóm..."
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium text-gray-800"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                  {groupAvatar ? (
                    <img
                      src={groupAvatar}
                      alt="Group Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users size={20} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base">{groupName}</h3>
                  <p className="text-xs text-gray-500">Chỉ Trưởng nhóm mới có quyền đổi thông tin nhóm</p>
                </div>
              </div>
            )}
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
        </div>

        <div className="flex justify-end p-5 border-t border-gray-100 gap-3 bg-gray-50/80 shrink-0">
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
