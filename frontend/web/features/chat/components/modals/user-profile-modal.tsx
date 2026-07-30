"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, User, Phone, Calendar, Info } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setSelectedProfileUserId } from "@/store/chat/chat-slice";
import { getPublicProfile, createDirectConversation } from "../../api/chat.api";
import { UserProfileResponse } from "../../types/chat.types";
import { toast } from "react-toastify";

const UserProfileModal = React.memo(function UserProfileModal() {
  const dispatch = useAppDispatch();
  const selectedProfileUserId = useAppSelector(
    (state) => state.chat.selectedProfileUserId,
  );

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileResponse | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!selectedProfileUserId) {
        setUserProfile(null);
        return;
      }

      setLoading(true);
      try {
        const response = await getPublicProfile(selectedProfileUserId);
        if (response?.success) {
          setUserProfile(response.data);
        } else {
          toast.error("Không thể tải thông tin người dùng");
        }
      } catch (err) {
        toast.error("Lỗi khi tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [selectedProfileUserId]);

  if (!mounted || !selectedProfileUserId) return null;

  const handleClose = () => {
    dispatch(setSelectedProfileUserId(null));
  };

  const handleMessage = async () => {
    if (!selectedProfileUserId) return;
    try {
      const response = await createDirectConversation(selectedProfileUserId);
      if (response?.success) {
        // Dispatch an event to notify ChatSidebar to refresh/select
        window.dispatchEvent(
          new CustomEvent("REFRESH_CONVERSATIONS", { detail: response.data }),
        );
        handleClose();
      } else {
        toast.error(response?.message || "Lỗi khi tạo phòng chat");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi tạo phòng chat");
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight">
            Hồ sơ người dùng
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-gray-500">
                Đang tải thông tin...
              </p>
            </div>
          ) : userProfile ? (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center overflow-hidden shadow-md border-2 border-white mb-4">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {userProfile.fullName || "Người dùng ẩn danh"}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {userProfile.email || "Không có email"}
              </p>

              <div className="w-full bg-gray-50 rounded-xl p-4 flex flex-col gap-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Phone size={18} className="text-gray-400" />
                  <span>
                    {userProfile.phoneNumber || "Chưa cập nhật số điện thoại"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Calendar size={18} className="text-gray-400" />
                  <span>
                    {userProfile.dob
                      ? new Date(userProfile.dob).toLocaleDateString("vi-VN")
                      : "Chưa cập nhật ngày sinh"}
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-700 mt-2 pt-2 border-t border-gray-200">
                  <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
                  {userProfile.bio ? (
                    <span className="italic">"{userProfile.bio}"</span>
                  ) : (
                    <span>Chưa cập nhật tiểu sử</span>
                  )}
                </div>
              </div>

              <button
                onClick={handleMessage}
                className="cursor-pointer w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Bắt đầu nhắn tin
              </button>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              Không tìm thấy thông tin người dùng
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
});

export default UserProfileModal;
