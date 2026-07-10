import React, { useEffect, useState } from "react";
import { BarChart2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useAppSelector } from "@/store/store";
import { ChatEvent } from "../../api/chat.events";
import { socketService } from "../../api/chat-socket.service";
import { pollApi } from "../../api/poll.api";
import ViewPollModal from "./../view-poll-modal";

interface PollsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  onSeeAll?: () => void;
}

export default function PollsSection({
  isExpanded,
  onToggle,
  onSeeAll,
}: PollsSectionProps) {
  const activeConversation = useAppSelector(
    (state) => state.chat.activeConversation,
  );
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeConversation) return;

    const fetchPolls = async () => {
      try {
        setLoading(true);
        const res = await pollApi.getPollsInConversation(activeConversation.id);
        if (res.success) {
          setPolls(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch polls", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolls();
  }, [activeConversation?.id]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !activeConversation) return;

    const handlePollUpdated = (data: any) => {
      if (data.conversationId === activeConversation.id && data.poll) {
        setPolls((prev) => {
          const exists = prev.findIndex((p) => p.id === data.poll.id);
          if (exists !== -1) {
            const newPolls = [...prev];
            newPolls[exists] = data.poll;
            return newPolls;
          }
          return [data.poll, ...prev];
        });
      }
    };

    socket.on(ChatEvent.POLL_UPDATED, handlePollUpdated);
    return () => {
      socket.off(ChatEvent.POLL_UPDATED, handlePollUpdated);
    };
  }, [activeConversation?.id]);

  const displayPolls = polls.slice(0, 3);
  const hasMore = polls.length > 3;

  const selectedPoll = polls.find((p) => p.id === selectedPollId);

  return (
    <div>
      <button
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3 text-gray-800 font-medium text-sm">
          <BarChart2 size={18} className="text-gray-500" />
          Polls
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="text-gray-400 animate-spin" />
            </div>
          ) : polls.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">
              Chưa có bình chọn nào
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {displayPolls.map((poll) => (
                  <div
                    key={poll.id}
                    onClick={() => setSelectedPollId(poll.id)}
                    className="p-3 bg-gray-100 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    <p className="text-xs font-semibold text-gray-700 mb-1 truncate">
                      {poll.title}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {poll.options?.length || 0} lựa chọn
                    </p>
                  </div>
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={onSeeAll}
                  className="cursor-pointer w-full mt-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-100 bg-blue-50 rounded-lg transition"
                >
                  Xem tất cả
                </button>
              )}
            </>
          )}
        </div>
      )}
      <div className="h-px bg-gray-100 mx-4 my-1"></div>

      <ViewPollModal
        isOpen={!!selectedPoll}
        onClose={() => setSelectedPollId(null)}
        poll={selectedPoll}
        conversationId={activeConversation?.id || ""}
      />
    </div>
  );
}
