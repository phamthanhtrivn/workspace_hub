"use client";

import { useQuery } from "@tanstack/react-query";
import { getConversationThreads } from "../../api/chat.api";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { useAppDispatch } from "@/store/store";
import { setActiveThreadRootMessage } from "@/store/chat/chat-slice";
import { X, MessageSquare, User, MessageCircle } from "lucide-react";
import Image from "next/image";
import { formatTimeAgo } from "@/lib/date";

interface ThreadsListViewProps {
  conversationId: string;
  onClose: () => void;
}

export default function ThreadsListView({
  conversationId,
  onClose,
}: ThreadsListViewProps) {
  const dispatch = useAppDispatch();
  const memberProfiles = useChatMemberProfiles() || {};

  const { data: threadsData, isLoading } = useQuery({
    queryKey: ["conversation-threads", conversationId],
    queryFn: async () => {
      const res = await getConversationThreads(conversationId);
      return res?.success ? res.data : [];
    },
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll threads list every 3s for real-time updates
  });

  const threads = threadsData || [];

  const handleOpenThread = (message: any) => {
    dispatch(setActiveThreadRootMessage(message));
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-blue-500" />
          <h3 className="font-bold text-slate-800 text-sm">Các luồng thảo luận</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-slate-400 italic">
            Đang tải danh sách luồng...
          </div>
        ) : threads.length > 0 ? (
          threads.map((msg: any) => {
            const sender = memberProfiles[msg.senderId];
            const senderName = sender?.fullName || "Người dùng";
            const avatarUrl = sender?.avatarUrl;

            let lastReplyTimeStr = "";
            if (msg.threadLastReplyAt) {
              lastReplyTimeStr = formatTimeAgo(msg.threadLastReplyAt);
            }

            return (
              <div
                key={msg.id}
                onClick={() => handleOpenThread(msg)}
                className="p-3 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/20 rounded-xl cursor-pointer transition flex flex-col gap-2"
              >
                {/* Header info */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Avatar"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    ) : (
                      <User size={12} className="text-slate-400" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {senderName}
                  </span>
                </div>

                {/* Message body snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 break-words">
                  {msg.content || "[Tin nhắn đính kèm]"}
                </p>

                {/* Footer status */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100/50 mt-1 shrink-0">
                  <span className="flex items-center gap-1 text-blue-600 font-bold">
                    <MessageSquare size={12} />
                    {msg.threadReplyCount} phản hồi
                  </span>
                  {lastReplyTimeStr && (
                    <span>Phản hồi cuối: {lastReplyTimeStr}</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400">
            <MessageSquare size={32} className="text-slate-300 mb-2" />
            <p className="text-xs">Chưa có luồng thảo luận nào trong kênh này</p>
            <p className="text-[10px] text-slate-400 max-w-[180px] mt-1">
              Phản hồi theo chủ đề bất kỳ tin nhắn nào để bắt đầu cuộc hội thảo theo luồng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
