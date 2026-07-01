"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  User,
  ArrowLeft,
  Calendar,
  Phone,
  Info,
  MessageCircle,
} from "lucide-react";
import { searchUserByEmail, getPublicProfile } from "../api/chat.api";
import { UserSearchResponse, UserProfileResponse } from "../types/chat.types";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchUserModal({
  isOpen,
  onClose,
}: SearchUserModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();

  // Selected User Profile states
  const [selectedUser, setSelectedUser] = useState<UserSearchResponse | null>(
    null,
  );
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(
    null,
  );
  const [loadingProfile, setLoadingProfile] = useState(false);

  // For portal to work in SSR Next.js safely
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal closes or opens
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setResults([]);
      setError("");
      setSelectedUser(null);
      setUserProfile(null);
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
        const users = await searchUserByEmail(email);
        setResults(users);
        if (users.length === 0) {
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
  }, [email]);

  const handleSelectUser = async (user: UserSearchResponse) => {
    setSelectedUser(user);
    setLoadingProfile(true);
    try {
      const profile = await getPublicProfile(user.id);
      setUserProfile(profile);
    } catch (err) {
      toast.error("Không thể lấy thông tin chi tiết người dùng");
      setSelectedUser(null); // Go back if error
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleMessage = async (user: UserSearchResponse) => {
    try {
      // Assuming createDirectConversation returns an object with conversation id
      // For now, just toast or push somewhere.
      // const conversation = await createDirectConversation(user.id);
      // router.push(`/chat/${conversation.id}`);

      toast.success("Tính năng tạo phòng chat đang được hoàn thiện!");
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo phòng chat");
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {selectedUser && (
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 -ml-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">
              {selectedUser ? "Hồ sơ người dùng" : "Thêm kết nối mới"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {!selectedUser ? (
          <>
            <div className="px-6 py-5 flex-shrink-0 border-b border-gray-100 bg-gray-50/50">
              <div className="relative group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email người dùng..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm"
                />
                <Search
                  className="absolute left-3.5 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                  size={20}
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-white">
              {loading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-sm font-medium text-gray-500">
                    Đang tìm kiếm...
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                    <Search size={24} className="text-red-400" />
                  </div>
                  <p className="text-red-500 font-medium">{error}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Vui lòng kiểm tra lại địa chỉ email.
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                results.length === 0 &&
                email.trim() !== "" && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <Search size={24} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">
                      Không có kết quả
                    </p>
                  </div>
                )}

              {!loading && results.length > 0 && (
                <div className="flex flex-col gap-2">
                  {results.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-gray-100">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt="avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User size={22} className="text-gray-400" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-700 transition-colors">
                            {user.fullName || "Người dùng ẩn danh"}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessage(user);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors shrink-0 cursor-pointer"
                        title="Nhắn tin"
                      >
                        <MessageCircle size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 bg-white">
            {loadingProfile ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-500">
                  Đang tải thông tin...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center overflow-hidden shadow-md border-2 border-white mb-4">
                  {userProfile?.avatarUrl || selectedUser.avatarUrl ? (
                    <img
                      src={
                        userProfile?.avatarUrl || selectedUser.avatarUrl || ""
                      }
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={40} className="text-gray-400" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {userProfile?.fullName ||
                    selectedUser.fullName ||
                    "Người dùng ẩn danh"}
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  {userProfile?.email ||
                    selectedUser.email ||
                    "Người dùng ẩn danh"}
                </p>

                <div className="w-full bg-gray-50 rounded-xl p-4 flex flex-col gap-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Phone size={18} className="text-gray-400" />
                    <span>
                      {userProfile?.phoneNumber ||
                        "Chưa cập nhật số điện thoại"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Calendar size={18} className="text-gray-400" />
                    <span>
                      {userProfile?.dob
                        ? new Date(userProfile.dob).toLocaleDateString("vi-VN")
                        : "Chưa cập nhật ngày sinh"}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm text-gray-700 mt-2 pt-2 border-t border-gray-200">
                    <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
                    {userProfile?.bio || selectedUser.bio ? (
                      <span className="italic">
                        "{userProfile?.bio || selectedUser.bio}"
                      </span>
                    ) : (
                      <span>Chưa cập nhật tiểu sử</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleMessage(selectedUser)}
                  className="cursor-pointer w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Bắt đầu nhắn tin
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
