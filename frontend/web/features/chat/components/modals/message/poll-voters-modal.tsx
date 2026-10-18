"use client";

import dialogLayout from "@/components/ui/responsive-dialog.module.css";

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

function getVoterName(voter: PollVoterListItem, fallback: string) {
  return voter.profile?.fullName || voter.profile?.email || fallback;
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/40 px-4 py-6">
      <div className={`${dialogLayout.surface} flex h-[720px] max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-panel border border-border bg-card text-foreground animate-in fade-in zoom-in-95 duration-200`}>
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
          <div>
            <h2 className="text-section-title font-semibold tracking-tight text-foreground">
              Poll Results & Voters
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              {`${totalUniqueVoters} total voters`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close poll voters"
          >
            <X size={20} />
          </button>
        </div>

        <div className={`${dialogLayout.body} min-h-0 flex-1 overflow-y-auto bg-card px-4 py-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border`}>
          <div className="space-y-4">
            {voterSections.map((section) => (
              <section
                key={section.optionId}
                className="rounded-panel border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {section.optionText}
                  </h3>
                  <span className="shrink-0 rounded-full bg-info-soft px-2.5 py-1 text-xs font-semibold text-info">
                    {`${section.voters.length} votes`}
                  </span>
                </div>

                {section.voters.length === 0 ? (
                  <p className="mt-3 text-sm font-medium text-muted-foreground">
                    No votes yet for this option
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {section.voters.map((voter) => {
                      const displayName = getVoterName(
                        voter,
                        "User",
                      );
                      const canOpenProfile = Boolean(onUserClick);

                      return (
                        <button
                          key={`${section.optionId}-${voter.userId}`}
                          type="button"
                          onClick={() => onUserClick?.(voter.userId)}
                          disabled={!canOpenProfile}
                          className="flex min-w-0 items-center gap-3 rounded-control bg-card px-2 py-2 text-left ring-1 ring-ring transition enabled:cursor-pointer enabled:hover:bg-info-soft/60 enabled:hover:ring-ring"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-ring">
                            {voter.profile?.avatarUrl ? (
                              <img
                                src={voter.profile.avatarUrl}
                                alt={displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User size={18} className="text-muted-foreground" />
                            )}
                          </div>
                          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
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

