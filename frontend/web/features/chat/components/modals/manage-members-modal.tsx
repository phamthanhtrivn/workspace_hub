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
  kickMember,
  leaveConversation,
  disbandConversation,
} from "../../api/chat.api";
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

    const actionText =
      role === "ADMIN"
        ? "promote this user to Admin"
        : "demote this user to Member";
    const result = await Swal.fire({
      title: "Update role?",
      text: `Are you sure you want to ${actionText}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setIsProcessing(true);
    try {
      await updateMemberRole(conversation.id, memberId, role);
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["channels", conversation.spaceId] });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update role",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKickMember = async (memberId: string) => {
    if (isProcessing) return;
    const result = await Swal.fire({
      title: "Kick member?",
      text: "Are you sure you want to remove this user from the space?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Kick",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      await kickMember(conversation.id, memberId);
      toast.success("Member kicked successfully");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["channels", conversation.spaceId] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to kick member");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaveSpace = async () => {
    if (isProcessing) return;

    const result = await Swal.fire({
      title: "Leave space?",
      text: "Are you sure you want to leave this space?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Leave space",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      await leaveConversation(conversation.id);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["channels", conversation.spaceId] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to leave space");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisbandChannel = async () => {
    if (isProcessing) return;
    const result = await Swal.fire({
      title: "Disband channel?",
      text: "Are you sure you want to disband this channel? All messages and data will be permanently deleted.",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Disband",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;
    setIsProcessing(true);
    try {
      await disbandConversation(conversation.id);
      toast.success("Channel disbanded successfully");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["channels", conversation.spaceId] });
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to disband channel");
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
            Manage Members
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
              placeholder="Search members..."
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
            const displayName = isMe ? "You" : name;

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
                      {member.role === "ADMIN" && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border border-gray-200">
                          <FaKey size={10} className="text-gray-400" /> Admin
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
                    {currentUserRole === "ADMIN" && (
                      <>
                        {member.role === "MEMBER" && (
                          <button
                            onClick={() =>
                              handleUpdateRole(member.userId, "ADMIN")
                            }
                            title="Promote to Admin"
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
                            title="Demote to Member"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <FiShieldOff size={18} />
                          </button>
                        )}
                      </>
                    )}

                    {currentUserRole === "ADMIN" &&
                      member.role === "MEMBER" && (
                      <button
                        onClick={() => handleKickMember(member.userId)}
                        title="Remove from space"
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
            onClick={handleLeaveSpace}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <FiLogOut size={18} />
            Leave space
          </button>

          {currentUserRole === "ADMIN" && (
            <button
              onClick={handleDisbandChannel}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-200"
            >
              <FiTrash2 size={18} />
              Disband channel
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
