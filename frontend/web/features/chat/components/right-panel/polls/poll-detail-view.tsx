import { QueryFeedback } from "@/components/common/query-feedback";
import { useState, useEffect } from "react";
import { ArrowLeft, BarChart2, Loader2, Search } from "lucide-react";
import ViewPollModal from "../../modals/message/view-poll-modal";
import { usePolls } from "../../../hooks/usePolls";
import { PollOptionResponse, PollResponse } from "../../../types/chat.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


interface PollDetailViewProps {
  conversationId: string;
  onBack: () => void;
}

export default function PollDetailView({
  conversationId,
  onBack,
}: PollDetailViewProps) {
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { polls, loading, isError, retrying, retry } = usePolls(conversationId, debouncedSearchQuery);

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);
  const getVoteCount = (poll: PollResponse) =>
    poll.options?.reduce(
      (sum: number, option: PollOptionResponse) =>
        sum + (option.votes?.length ?? 0),
      0,
    ) ?? 0;

  return (
    <div className="w-full h-full min-h-0 min-w-0 flex flex-col bg-card">
      <div className="min-h-16 shrink-0 flex-wrap gap-2 py-2 px-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        <Button variant="unstyled" aria-label="Back"
          onClick={onBack}
          className="cursor-pointer p-2 hover:bg-muted rounded-full text-muted-foreground transition"
        >
          <ArrowLeft size={20} />
        </Button>
        <h2 className="font-semibold text-foreground">
          Polls
        </h2>
      </div>

      <div className="border-b border-border px-4 py-3 flex-shrink-0">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input aria-label="Search polls by title" unstyled
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search polls by title..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-muted border border-transparent rounded-control focus:bg-card focus:border-info-outline focus:ring-1 focus:ring-ring outline-none transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isError && polls.length > 0 && <QueryFeedback label="polls" error retrying={retrying} onRetry={() => retry()} />}
          {isError && polls.length === 0 ? <QueryFeedback label="polls" error retrying={retrying} onRetry={() => retry()} /> : loading ? (
          <div className="text-center py-4 flex justify-center">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            {searchQuery
              ? "No matching polls found"
              : "No polls available"}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {polls.map((poll) => (
              <Button variant="unstyled" type="button"
                key={poll.id}
                onClick={() => setSelectedPollId(poll.id)}
                className="w-full text-left p-4 bg-info-soft border border-border rounded-panel cursor-pointer hover:bg-info-soft transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-info-soft text-info-content rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-info-content mb-1">
                      {poll.title || "Untitled Poll"}
                    </p>
                    <div className="text-xs text-info-content space-y-1">
                      <p>
                        {`${poll.options?.length || 0} ${poll.options?.length === 1 ? "option" : "options"}`}
                      </p>
                      <p>
                        {`${getVoteCount(poll)} ${getVoteCount(poll) === 1 ? "vote" : "votes"}`}
                      </p>
                      {poll.isLocked && (
                        <span className="inline-block mt-1 bg-destructive-soft text-destructive-content px-2 py-0.5 rounded font-medium">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
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
