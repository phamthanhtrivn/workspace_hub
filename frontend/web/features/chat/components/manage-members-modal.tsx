import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiSearch,
  FiShield,
  FiShieldOff,
  FiLogOut,
  FiTrash2,
} from "react-icons/fi";
import {
  updateMemberRole,
  transferOwnership,
  kickMember,
  leaveConversation,
  disbandConversation,
} from "../api/chat.api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Swal from "sweetalert2";
import { FaKey } from "react-icons/fa";

interface ManageMembersModalProps {
  conversation: any;
  memberProfiles: any;
  currentUserId: string;
  onClose: () => void;
}

export default function ManageMembersModal({
  conversation,
  memberProfiles,
  currentUserId,
  onClose,
}: ManageMembersModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUserMember = conversation.members?.find(
    (m: any) => m.userId === currentUserId,
  );
  const currentUserRole = currentUserMember?.role;

  const handleUpdateRole = async (
    memberId: string,
    role: "ADMIN" | "MEMBER",
  ) => {
    if (isProcessing) return;
    
    const actionText = role === "ADMIN" ? "thăng cấp người này thành Phó nhóm" : "giáng cấp người này xuống Thành viên";
    const result = await Swal.fire({
      title: "Cập nhật vai trò?",
      text: `Bạn có chắc chắn muốn ${actionText}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;

    setIsProcessing(true);
    try {
      await updateMemberRole(conversation.id, memberId, role);
      toast.success("Cập nhật vai trò thành công");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Không thể cập nhật vai trò",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    if (isProcessing) return;

    const result = await Swal.fire({
      title: "Chuyển quyền Trưởng nhóm?",
      text: "Bạn có chắc chắn muốn chuyển quyền Trưởng nhóm cho người này?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      await transferOwnership(conversation.id, memberId);
      toast.success("Đã chuyển quyền trưởng nhóm");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Không thể chuyển quyền trưởng nhóm",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (isProcessing) return;
    const result = await Swal.fire({
      title: "Xóa thành viên?",
      text: "Bạn có chắc chắn muốn xóa người này khỏi nhóm?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      await kickMember(conversation.id, memberId);
      toast.success("Đã xóa khỏi nhóm");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể xóa thành viên");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isProcessing) return;
    if (currentUserRole === "OWNER") {
      const otherMembers = conversation.members?.filter(
        (m: any) => m.userId !== currentUserId,
      );
      if (otherMembers?.length > 0) {
        toast.error("Vui lòng chuyển quyền Trưởng nhóm trước khi rời nhóm");
        return;
      }
    }

    const result = await Swal.fire({
      title: "Rời nhóm?",
      text: "Bạn có chắc chắn muốn rời nhóm?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Rời nhóm",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      await leaveConversation(conversation.id);
      toast.success("Đã rời nhóm");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể rời nhóm");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisbandGroup = async () => {
    if (isProcessing) return;
    const result = await Swal.fire({
      title: "Giải tán nhóm?",
      text: "Bạn có chắc chắn muốn giải tán nhóm? Toàn bộ thông tin nhóm sẽ bị xoá vĩnh viễn.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Giải tán",
      cancelButtonText: "Hủy",
    });

    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      await disbandConversation(conversation.id);
      toast.success("Đã giải tán nhóm");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể giải tán nhóm");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMembers = conversation.members?.filter((member: any) => {
    const profile = memberProfiles?.[member.userId];
    const name = profile?.fullName || "User";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">
            Quản lý thành viên
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative group">
            <FiSearch
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Tìm kiếm thành viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {filteredMembers?.map((member: any) => {
            const profile = memberProfiles?.[member.userId];
            const name = profile?.fullName || "User";
            const isMe = member.userId === currentUserId;
            const displayName = isMe ? "Bạn" : name;

            return (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 overflow-hidden">
                    {profile?.avatarUrl ? (
                      <Image
                        src={profile.avatarUrl}
                        alt="Avatar"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="font-bold text-sm">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">
                        {displayName}
                      </span>
                      {member.role === "OWNER" && (
                        <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border border-yellow-100">
                          <FaKey size={10} className="text-yellow-500" /> Trưởng
                          nhóm
                        </span>
                      )}
                      {member.role === "ADMIN" && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border border-gray-200">
                          <FaKey size={10} className="text-gray-400" /> Phó nhóm
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {profile?.email}
                    </span>
                  </div>
                </div>

                {!isMe && (
                  <div className="flex items-center gap-2">
                    {currentUserRole === "OWNER" && (
                      <>
                        {member.role === "MEMBER" && (
                          <button
                            onClick={() =>
                              handleUpdateRole(member.userId, "ADMIN")
                            }
                            title="Thăng cấp Phó nhóm"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <FiShield size={18} />
                          </button>
                        )}
                        {member.role === "ADMIN" && (
                          <button
                            onClick={() =>
                              handleUpdateRole(member.userId, "MEMBER")
                            }
                            title="Giáng cấp Thành viên"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <FiShieldOff size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleTransferOwnership(member.userId)}
                          title="Chuyển quyền Trưởng nhóm"
                          className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <FiShieldOff size={18} />
                        </button>
                      </>
                    )}

                    {(currentUserRole === "OWNER" ||
                      (currentUserRole === "ADMIN" &&
                        member.role === "MEMBER")) && (
                      <button
                        onClick={() => handleKickMember(member.userId)}
                        title="Xóa khỏi nhóm"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={handleLeaveGroup}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <FiLogOut size={18} />
            Rời nhóm
          </button>

          {currentUserRole === "OWNER" && (
            <button
              onClick={handleDisbandGroup}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-200"
            >
              <FiTrash2 size={18} />
              Giải tán nhóm
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
