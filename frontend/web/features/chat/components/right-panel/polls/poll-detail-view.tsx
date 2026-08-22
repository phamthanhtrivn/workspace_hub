import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, BarChart2, Loader2, Search } from "lucide-react";
import ViewPollModal from "../../modals/message/view-poll-modal";
import { usePolls } from "../../../hooks/usePolls";
import { PollOptionResponse, PollResponse } from "../../../types/chat.types";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface PollDetailViewProps {
  conversationId: string;
  onBack: () => void;
}

export default function PollDetailView({
  conversationId,
  onBack,
}: PollDetailViewProps) {
  const intl = useAppIntl();
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { polls, loading } = usePolls(conversationId, debouncedSearchQuery);

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);
  const getVoteCount = (poll: PollResponse) =>
    poll.options?.reduce(
      (sum: number, option: PollOptionResponse) =>
        sum + (option.votes?.length ?? 0),
      0,
    ) ?? 0;

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="h-16 px-4 border-b border-gray-200 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold text-gray-800">
          {intl.formatMessage({ id: "chat.polls" })}
        </h2>
      </div>

      <div className="border-b border-gray-100 px-4 py-3 flex-shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: "chat.searchPollsByTitle" })}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-100 border border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-4 flex justify-center">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            {searchQuery
              ? intl.formatMessage({ id: "chat.noMatchingPolls" })
              : intl.formatMessage({ id: "chat.noPollsAvailable" })}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {polls.map((poll) => (
              <div
                key={poll.id}
                onClick={() => setSelectedPollId(poll.id)}
                className="p-4 bg-purple-50 border border-purple-100 rounded-xl cursor-pointer hover:bg-purple-100 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-purple-900 mb-1">
                      {poll.title ||
                        intl.formatMessage({ id: "chat.untitledPoll" })}
                    </p>
                    <div className="text-xs text-purple-600/70 space-y-1">
                      <p>
                        {intl.formatMessage(
                          { id: "chat.optionsCount" },
                          { count: poll.options?.length || 0 },
                        )}
                      </p>
                      <p>
                        {intl.formatMessage(
                          { id: "chat.voteCount" },
                          { count: getVoteCount(poll) },
                        )}
                      </p>
                      {poll.isLocked && (
                        <span className="inline-block mt-1 bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">
                          {intl.formatMessage({ id: "chat.locked" })}
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
