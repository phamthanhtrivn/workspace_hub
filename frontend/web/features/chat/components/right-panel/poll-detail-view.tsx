import React, { useEffect, useState } from "react";
import { ArrowLeft, BarChart2, Loader2 } from "lucide-react";
import { pollApi } from "../../api/poll.api";
import { ChatEvent } from "../../api/chat.events";
import { socketService } from "../../api/chat-socket.service";
import ViewPollModal from "../view-poll-modal";

interface PollDetailViewProps {
  conversationId: string;
  onBack: () => void;
}

export default function PollDetailView({
  conversationId,
  onBack,
}: PollDetailViewProps) {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        setLoading(true);
        const res = await pollApi.getPollsInConversation(conversationId);
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
  }, [conversationId]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handlePollUpdated = (data: any) => {
      let pollData = null;
      let convId = null;

      if (data.type === "POLL" && data.poll) {
        // From MESSAGE_MOVED
        pollData = data.poll;
        convId = data.conversationId;
      } else if (data.poll) {
        // From POLL_UPDATED
        pollData = data.poll;
        convId = data.conversationId;
      }

      if (convId === conversationId && pollData) {
        setPolls((prev) => {
          const exists = prev.findIndex((p) => p.id === pollData.id);
          if (exists !== -1) {
            const newPolls = [...prev];
            newPolls[exists] = pollData;
            return newPolls;
          }
          return [pollData, ...prev];
        });
      }
    };

    socket.on(ChatEvent.POLL_UPDATED, handlePollUpdated);
    socket.on(ChatEvent.MESSAGE_MOVED, handlePollUpdated);
    return () => {
      socket.off(ChatEvent.POLL_UPDATED, handlePollUpdated);
      socket.off(ChatEvent.MESSAGE_MOVED, handlePollUpdated);
    };
  }, [conversationId]);

  const selectedPoll = polls.find((p) => p.id === selectedPollId);

  console.log(polls);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-800">Bình chọn</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-4 flex justify-center">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            Không có bình chọn nào
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {polls.map((poll) => (
              <div
                key={poll.id}
                onClick={() => setSelectedPollId(poll.id)}
                className="p-4 bg-gray-50 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      {poll.title}
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>{poll.options?.length || 0} lựa chọn</p>
                      <p>
                        {poll.options?.reduce(
                          (sum: number, opt: any) =>
                            sum + (opt.votes?.length || 0),
                          0,
                        )}{" "}
                        lượt bình chọn
                      </p>
                      {poll.isLocked && (
                        <span className="inline-block mt-1 bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">
                          Đã khóa
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ViewPollModal
        isOpen={!!selectedPoll}
        onClose={() => setSelectedPollId(null)}
        poll={selectedPoll}
        conversationId={conversationId}
      />
    </div>
  );
}
