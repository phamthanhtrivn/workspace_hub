"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  User,
  Users,
  Camera,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { searchUserByEmail, createGroupConversation } from "../api/chat.api";
import { UserSearchResponse } from "../types/chat.types";
import { getAvatarPresignedUrl } from "../../user-setting/api/user-setting.api";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/store";
import axios from "axios";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated?: (conversation: any) => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onConversationCreated,
}: CreateGroupModalProps) {
  const [email, setEmail] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [error, setError] = useState("");

  const [selectedUsers, setSelectedUsers] = useState<UserSearchResponse[]>([]);

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = useAppSelector((state) => state.auth.userId);

  // For portal to work in SSR Next.js safely
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal closes or opens
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setGroupName("");
      setResults([]);
      setError("");
      setSelectedUsers([]);
      setAvatarUrl("");
    }
  }, [isOpen]);

  // Search as you type debounce
  useEffect(() => {
    if (!email.trim()) {
      setResults([]);
      setError("");
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await searchUserByEmail(email);
        const users = response?.success ? response.data : [];
        // Lọc bỏ chính mình và những người đã chọn
        const filteredUsers = users.filter(
          (u: UserSearchResponse) =>
            u.id !== currentUserId &&
            !selectedUsers.some((selected) => selected.id === u.id),
        );
        setResults(filteredUsers);
        if (filteredUsers.length === 0 && users.length > 0) {
          setError("Người dùng này đã được chọn");
        } else if (filteredUsers.length === 0) {
          setError("Không tìm thấy người dùng");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Lỗi tìm kiếm");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, selectedUsers, currentUserId]);

  const handleSelectUser = (user: UserSearchResponse) => {
    setSelectedUsers((prev) => [...prev, user]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const response = await getAvatarPresignedUrl(file.name, file.type);
      if (response && response.success) {
        const { presignedUrl, fileUrl } = response.data;

        await axios.put(presignedUrl, file, {
          headers: {
            "Content-Type": file.type,
          },
        });

        setAvatarUrl(fileUrl);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 thành viên");
      return;
    }

    setIsCreating(true);
    try {
      const participantIds = selectedUsers.map((u) => u.id);
      const response = await createGroupConversation(
        groupName.trim(),
        avatarUrl || undefined,
        participantIds,
      );

      if (response && response.success) {
        onConversationCreated?.(response.data);
        onClose();
      } else {
        toast.error(response?.message || "Lỗi khi tạo nhóm chat");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo nhóm chat");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">
            Tạo nhóm trò chuyện
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 bg-white">
          <div className="p-6 pb-2 border-b border-gray-50 flex flex-col items-center">
            {/* Avatar Upload */}
            <div className="relative group shrink-0 mb-4">
              <div className="grid h-24 w-24 place-items-center rounded-full border-2 border-gray-100 bg-gray-50 text-2xl font-bold text-white shadow-sm overflow-hidden">
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Group Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Users size={36} className="text-gray-300" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-full cursor-pointer"
                disabled={isUploadingAvatar}
              >
                <Camera className="h-7 w-7" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Group Name */}
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Tên nhóm (bắt buộc)..."
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium text-gray-800 placeholder:text-gray-400 text-center"
            />
          </div>

          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Thành viên ({selectedUsers.length})
            </h3>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full py-1 pl-1 pr-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-white overflow-hidden shrink-0 border border-blue-100 flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={12} className="text-gray-400" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-blue-700 truncate max-w-[100px]">
                      {user.fullName || "Ẩn danh"}
                    </span>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-blue-400 hover:text-blue-600 focus:outline-none ml-1 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative group mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tìm bạn bè bằng email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm"
              />
              <Search
                className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                size={18}
              />
            </div>

            {/* Search Results */}
            <div className="min-h-[150px]">
              {loading && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <div className="w-6 h-6 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
              )}

              {!loading && error && (
                <div className="text-center py-6 text-sm text-red-500 font-medium">
                  {error}
                </div>
              )}

              {!loading && !error && results.length > 0 && (
                <div className="flex flex-col gap-1">
                  {results.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-gray-800 text-sm truncate">
                            {user.fullName || "Người dùng ẩn danh"}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full border border-gray-300 group-hover:border-blue-500 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                        <PlusIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500 hidden group-hover:block" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleCreateGroup}
            disabled={
              selectedUsers.length === 0 || !groupName.trim() || isCreating
            }
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary-dark)] text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
          >
            {isCreating ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Đang tạo...
              </>
            ) : (
              <>Tạo nhóm ({selectedUsers.length + 1})</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
