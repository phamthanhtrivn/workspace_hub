import React, { useEffect, useState } from "react";
import { Check, X, Loader2, Bell } from "lucide-react";
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  getPublicProfile,
} from "../api/chat.api";
import { GroupInvitation } from "../types/chat.types";
import { socketService } from "../api/chat-socket.service";
import { ChatEvent } from "../api/chat.events";

interface InvitationListProps {
  currentUserId: string | null;
  onAccept: (conversationId: string) => void;
}

export default function InvitationList({
  currentUserId,
  onAccept,
}: InvitationListProps) {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inviterProfiles, setInviterProfiles] = useState<Record<string, any>>(
    {},
  );

  useEffect(() => {
    if (!currentUserId) return;

    const fetchInvitations = async () => {
      try {
        const response = await getPendingInvitations();
        if (response?.success) {
          setInvitations(response.data);
          // Fetch profiles for inviters
          const uniqueInviters = Array.from(
            new Set(response.data.map((inv: any) => inv.invitedBy)),
          );
          const profiles: Record<string, any> = {};
          await Promise.all(
            uniqueInviters.map(async (id: any) => {
              const res = await getPublicProfile(id);
              if (res?.success) profiles[id] = res.data;
            }),
          );
          setInviterProfiles(profiles);
        }
      } catch (error) {
        console.error("Failed to fetch pending invitations", error);
      }
    };

    fetchInvitations();

    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewInvitation = (data: any) => {
      fetchInvitations();
    };

    socket.on(ChatEvent.GROUP_INVITATION, handleNewInvitation);
    return () => {
      socket.off(ChatEvent.GROUP_INVITATION, handleNewInvitation);
    };
  }, [currentUserId]);

  const handleAccept = async (invitationId: string, conversationId: string) => {
    try {
      setLoading(true);
      await acceptInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      onAccept(conversationId);
    } catch (error) {
      console.error("Lỗi khi chấp nhận lời mời", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      setLoading(true);
      await declineInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error("Lỗi khi từ chối lời mời", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-amber-50 hover:bg-amber-100 rounded-full text-amber-600 transition cursor-pointer relative"
        title="Lời mời vào nhóm"
      >
        <Bell size={18} />
        {invitations.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {invitations.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 w-80 bg-white shadow-xl rounded-xl border border-gray-100 z-50 p-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-2 border-b border-gray-100 flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm text-gray-800">
              Lời mời nhóm ({invitations.length})
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {invitations.length === 0 ? (
              <p className="text-sm text-center text-gray-500 py-6">
                Không có lời mời nào
              </p>
            ) : (
              invitations.map((inv) => {
                const inviter = inviterProfiles[inv.invitedBy];
                return (
                  <div
                    key={inv.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {inv.conversation?.avatarUrl ? (
                          <img
                            src={inv.conversation.avatarUrl}
                            alt="Group"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-blue-500">
                            {inv.conversation?.name?.charAt(0) || "G"}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {inv.conversation?.name || "Nhóm trò chuyện"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          Mời bởi {inviter?.fullName || "Ai đó"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(inv.id, inv.conversationId)}
                        disabled={loading}
                        className="flex-1 py-1.5 bg-[var(--color-primary)] text-white text-xs font-bold rounded-md hover:bg-[var(--color-primary-dark)] transition cursor-pointer"
                      >
                        Chấp nhận
                      </button>
                      <button
                        onClick={() => handleDecline(inv.id)}
                        disabled={loading}
                        className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-md hover:bg-gray-300 transition cursor-pointer"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
