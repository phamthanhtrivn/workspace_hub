"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X, User, Users, Loader2 } from "lucide-react";
import { searchUserByEmail, inviteMembers } from "../../api/chat.api";
import { UserSearchResponse } from "../../types/chat.types";
import { toast } from "react-toastify";
import { useAppSelector } from "@/store/store";

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onMembersAdded?: () => void;
}

const AddMembersModal = React.memo(function AddMembersModal({
  isOpen,
  onClose,
  conversationId,
  onMembersAdded,
}: AddMembersModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [error, setError] = useState("");

  const [selectedUsers, setSelectedUsers] = useState<UserSearchResponse[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const activeConversation = useAppSelector(
    (state) => state.chat.activeConversation,
  );

  const existingMemberIds = React.useMemo(() => {
    return new Set(
      activeConversation?.members?.map((m: any) => m.userId) || [],
    );
  }, [activeConversation]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setResults([]);
      setError("");
      setSelectedUsers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!email.trim()) {
      setResults([]);
      setError("");
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [email, selectedUsers]);

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await searchUserByEmail(email);
      const users = response?.success ? response.data : [];

      const filtered = users.filter(
        (u: UserSearchResponse) =>
          u.id !== currentUserId &&
          !selectedUsers.some((selected) => selected.id === u.id) &&
          !existingMemberIds.has(u.id),
      );
      setResults(filtered);

      if (filtered.length === 0 && users.length > 0) {
        const isAlreadyMember = users.some((u: any) =>
          existingMemberIds.has(u.id),
        );
        if (isAlreadyMember) {
          setError("Người dùng này đã là thành viên của nhóm");
        } else {
          setError("Người dùng này đã được chọn");
        }
      } else if (filtered.length === 0) {
        setError("Không tìm thấy người dùng");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi khi tìm kiếm");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = (user: UserSearchResponse) => {
    if (selectedUsers.some((u) => u.id === user.id)) return;
    setSelectedUsers([...selectedUsers, user]);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setIsAdding(true);
    try {
      const memberIds = selectedUsers.map((u) => u.id);
      const res = await inviteMembers(conversationId, memberIds);
      onMembersAdded?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi thêm thành viên");
    } finally {
      setIsAdding(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users size={16} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              Thêm thành viên
            </h2>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {selectedUsers.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Đã chọn ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName || "Avatar"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={12} />
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {user.fullName || "Ẩn danh"}
                    </span>
                    <button
                      onClick={() => handleRemoveUser(user.id)}
                      className="cursor-pointer p-0.5 hover:bg-blue-200 rounded-full transition-colors ml-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              Tìm kiếm
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Nhập email người dùng..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="min-h-[200px] border border-gray-100 rounded-xl bg-gray-50/50 p-2 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="text-sm">Đang tìm kiếm...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">
                {error}
              </div>
            ) : results.length > 0 ? (
              <div className="flex flex-col gap-1">
                {results.map((user) => {
                  const isSelected = selectedUsers.some(
                    (u) => u.id === user.id,
                  );
                  return (
                    <div
                      key={user.id}
                      onClick={() => !isSelected && handleAddUser(user)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                        isSelected
                          ? "bg-gray-100 opacity-60 cursor-not-allowed"
                          : "hover:bg-white hover:shadow-sm cursor-pointer border border-transparent hover:border-gray-100"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden flex-shrink-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName || "Avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {user.fullName || "Người dùng ẩn danh"}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {user.email}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                          Đã chọn
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                <Search size={32} className="opacity-20" />
                <span className="text-sm">Nhập email để tìm người dùng</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || isAdding}
            className="cursor-pointer px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-blue-200"
          >
            {isAdding && <Loader2 size={16} className="animate-spin" />}
            Thêm vào nhóm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
});

export default AddMembersModal;
