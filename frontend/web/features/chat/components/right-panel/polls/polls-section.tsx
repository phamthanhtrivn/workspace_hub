import { QueryFeedback } from "@/components/common/query-feedback";
import { useState } from "react";
import { BarChart2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import ViewPollModal from "../../modals/message/view-poll-modal";
import { formatDateTime } from "@/lib/date";
import { usePolls } from "../../../hooks/usePolls";
import SeeAllButton from "../see-all-button";
import { useActiveChat } from "../../../hooks/useChatQueries";
import { Button } from "@/components/ui/button";


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
  const { activeChat: activeConversation } = useActiveChat();

  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  const { polls, loading, isError, retrying, retry } = usePolls(activeConversation?.id);

  const displayPolls = polls.slice(0, 3);
  const hasMore = polls.length > 3;

  const selectedPoll = polls.find((poll) => poll.id === selectedPollId);

  return (
    <div>
      <Button variant="unstyled"
        onClick={onToggle}
        className="cursor-pointer w-full px-4 py-3 flex items-center justify-between hover:bg-background transition"
      >
        <div className="flex items-center gap-3 text-foreground font-medium text-sm">
          <BarChart2 size={18} className="text-muted-foreground" />
          Polls
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={16} className="text-muted-foreground" />
        )}
      </Button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {isError && polls.length > 0 && <QueryFeedback label="polls" error retrying={retrying} onRetry={() => retry()} />}
          {isError && polls.length === 0 ? <QueryFeedback label="polls" error retrying={retrying} onRetry={() => retry()} /> : loading ? (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="text-muted-foreground animate-spin" />
            </div>
          ) : polls.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No polls available
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {displayPolls.map((poll) => (
                  <Button variant="unstyled" type="button"
                    key={poll.id}
                    onClick={() => setSelectedPollId(poll.id)}
                    className="w-full text-left p-3 bg-info-soft border border-border rounded-lg cursor-pointer hover:bg-info-soft transition-colors"
                  >
                    <p className="text-xs font-semibold text-info-content mb-1 truncate">
                      {poll.title || "Untitled Poll"}{" "}
                      -{" "}
                      {formatDateTime(poll.createdAt)}
                    </p>
                    <p className="text-xs text-info-content">
                      {`${poll.options?.length || 0} ${poll.options?.length === 1 ? "option" : "options"}`}
                    </p>
                  </Button>
                ))}
              </div>
              {hasMore && (
                <SeeAllButton onClick={onSeeAll}>
                  See all
                </SeeAllButton>
              )}
            </>
          )}
        </div>
      )}
      <div className="h-px bg-muted mx-4 my-1"></div>

      <ViewPollModal
        isOpen={!!selectedPoll}
        onClose={() => setSelectedPollId(null)}
        poll={selectedPoll}
        conversationId={activeConversation?.id || ""}
      />
    </div>
  );
}
