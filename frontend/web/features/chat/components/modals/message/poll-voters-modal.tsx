import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, User } from "lucide-react";
import {
  PollOptionResponse,
  PollResponse,
  PollVoteResponse,
  UserProfileSnapshotResponse,
} from "@/features/chat/types/chat.types";

interface PollVotersModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: PollResponse;
  onUserClick?: (userId: string) => void;
}

interface PollVoterListItem {
  userId: string;
  profile: UserProfileSnapshotResponse | null;
}

interface PollVoterOptionSection {
  optionId: string;
  optionText: string;
  voters: PollVoterListItem[];
}

function getVoteProfile(
  vote: PollVoteResponse,
): UserProfileSnapshotResponse | null {
  return vote.voterProfile ?? null;
}

function getVoterName(voter: PollVoterListItem) {
  return voter.profile?.fullName || voter.profile?.email || "User";
}

function getOptionVoters(option: PollOptionResponse): PollVoterListItem[] {
  return (option.votes ?? []).map((vote) => ({
    userId: vote.userId,
    profile: getVoteProfile(vote),
  }));
}

export default function PollVotersModal({
  isOpen,
  onClose,
  poll,
  onUserClick,
}: PollVotersModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalUniqueVoters = useMemo(() => {
    return new Set(
      poll.options.flatMap((option) =>
        (option.votes ?? []).map((vote) => vote.userId),
      ),
    ).size;
  }, [poll.options]);

  const voterSections = useMemo<PollVoterOptionSection[]>(
    () =>
      poll.options.map((option) => ({
        optionId: option.id,
        optionText: option.text,
        voters: getOptionVoters(option),
      })),
    [poll.options],
  );

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 px-4 py-6 backdrop-blur-sm">
      <div className="flex h-[720px] max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white text-gray-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white/85 px-6 py-4 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-800">
              Poll voter details
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-gray-400">
              {totalUniqueVoters} {totalUniqueVoters === 1 ? "voter" : "voters"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Close poll voters"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          <div className="space-y-4">
            {voterSections.map((section) => (
              <section
                key={section.optionId}
                className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 truncate text-sm font-bold text-gray-800">
                    {section.optionText}
                  </h3>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700">
                    {section.voters.length}{" "}
                    {section.voters.length === 1 ? "vote" : "votes"}
                  </span>
                </div>

                {section.voters.length === 0 ? (
                  <p className="mt-3 text-sm font-medium text-gray-400">
                    No votes yet
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {section.voters.map((voter) => {
                      const displayName = getVoterName(voter);
                      const canOpenProfile = Boolean(onUserClick);

                      return (
                        <button
                          key={`${section.optionId}-${voter.userId}`}
                          type="button"
                          onClick={() => onUserClick?.(voter.userId)}
                          disabled={!canOpenProfile}
                          className="flex min-w-0 items-center gap-3 rounded-xl bg-white px-2 py-2 text-left shadow-sm ring-1 ring-gray-100 transition enabled:cursor-pointer enabled:hover:bg-blue-50/60 enabled:hover:ring-blue-100"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                            {voter.profile?.avatarUrl ? (
                              <img
                                src={voter.profile.avatarUrl}
                                alt={displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User size={18} className="text-gray-400" />
                            )}
                          </div>
                          <span className="min-w-0 truncate text-sm font-semibold text-gray-700">
                            {displayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
