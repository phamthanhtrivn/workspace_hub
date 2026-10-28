"use client";

import { IconButton } from "@/components/ui/icon-button";

import React, { useState } from "react";
import {
  BarChart2,
  Users,
  CheckCircle2,
  User,
  Plus,
  Edit2,
  ChevronRight,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { formatDateTime } from "@/lib/date";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { PollResponse } from "../../types/chat.types";
import EditPollModal from "../modals/message/edit-poll-modal";
import PollVotersModal from "../modals/message/poll-voters-modal";
import { Button } from "@/components/ui/button";
import { NativeCheckbox } from "@/components/ui/checkbox";
import { NativeRadio } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";


interface PollMessageProps {
  poll: PollResponse;
  onVote?: (optionId: string) => void;
  onUserClick?: (userId: string) => void;
  onAddOption?: (text: string) => void;
  onEditPoll?: (
    title: string,
    multipleChoice: boolean,
    allowAddOptions: boolean,
    anonymous: boolean,
    isLocked: boolean,
  ) => void;
}

const PollMessage = React.memo(function PollMessage({
  poll,
  onVote,
  onUserClick,
  onAddOption,
  onEditPoll,
}: PollMessageProps) {
  const pollFieldId = React.useId();
  const currentUser = useAppSelector((state) => state.auth);
  const memberProfiles = useChatMemberProfiles();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);

  if (!poll || !poll.options) {
    return (
      <div className="text-muted-foreground italic p-4">
        Poll unavailable
      </div>
    );
  }

  const isMe = poll.createdBy === currentUser?.userId;
  const creatorProfile =
    poll.creatorProfile || memberProfiles?.[poll.createdBy] || null;

  const totalVotes = poll.options.reduce(
    (sum, opt) => sum + (opt.votes?.length || 0),
    0,
  );
  const totalUniqueVoters = new Set(
    poll.options.flatMap((option) =>
      (option.votes ?? []).map((vote) => vote.userId),
    ),
  ).size;

  // Find if current user has voted
  const userHasVoted = poll.options.some((opt) =>
    opt.votes?.some((v) => v.userId === currentUser?.userId),
  );

  const handleOptionClick = (optionId: string) => {
    if (poll.isLocked) return;
    if (onVote) {
      onVote(optionId);
    } else {
      if (poll.multipleChoice) {
        setSelectedOptions((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId],
        );
      } else {
        setSelectedOptions([optionId]);
      }
    }
  };

  const handleAddOptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOptionText.trim() && onAddOption) {
      onAddOption(newOptionText.trim());
      setNewOptionText("");
      setIsAddingOption(false);
    }
  };

  return (
    <div className="flex flex-col items-center my-4 w-full">
      <div className="bg-card border border-border rounded-panel p-5 max-w-md min-w-0 w-full [overflow-wrap:anywhere] relative overflow-hidden transition-all duration-200">
        <div className="flex items-start gap-3.5 mb-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-info-soft p-2.5 rounded-panel text-info-content mt-1 border border-border">
              <BarChart2 size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-[17px] leading-snug tracking-tight mb-1">
                {poll.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span>Created by</span>
                <span className="font-semibold text-muted-foreground">
                  <Button variant="unstyled" type="button"
                    className={`relative z-30 font-semibold ${!isMe ? "cursor-pointer hover:underline" : ""}`}
                    onClick={() => {
                      if (!isMe) onUserClick?.(poll.createdBy);
                    }}
                  >
                    {isMe
                      ? "you"
                      : creatorProfile?.fullName ||
                        creatorProfile?.email ||
                        "User"}
                  </Button>
                </span>
                <span>-</span>
                <span>{formatDateTime(poll.createdAt)}</span>
              </div>
            </div>
          </div>
          {isMe && onEditPoll && !poll.isLocked && (
            <IconButton label="Edit Poll" showTooltip={false} size="icon-sm"
              onClick={() => setIsEditModalOpen(true)}
              className="cursor-pointer p-2 text-muted-foreground hover:text-info-content hover:bg-info-soft rounded-control transition-colors flex-shrink-0"
              title="Edit Poll"
            >
              <Edit2 size={16} />
            </IconButton>
          )}
        </div>

        <div role={poll.multipleChoice ? "group" : "radiogroup"} aria-label={poll.title} className="space-y-2.5 mb-4">
          {poll.options.map((option) => {
            const voteCount = option.votes?.length || 0;
            const percentage =
              totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected =
              selectedOptions.includes(option.id) ||
              option.votes?.some((v) => v.userId === currentUser?.userId);

            return (
              <div
                key={option.id}
                className={`relative overflow-hidden rounded-panel border transition-all duration-200 ${isSelected ? "border-info-outline bg-info-soft/20" : "border-border hover:bg-background hover:border-input"} ${!poll.isLocked ? "cursor-pointer" : ""} group`}
              >
                <label className="absolute inset-0 z-20 cursor-pointer has-[:disabled]:cursor-default rounded-[inherit] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                  <span className="sr-only">{option.text}</span>
                  {poll.multipleChoice ? <NativeCheckbox data-ui-interaction-exception="Hidden form control preserves existing poll selection semantics." className="sr-only" checked={Boolean(isSelected)} disabled={poll.isLocked} onChange={() => handleOptionClick(option.id)} /> : <NativeRadio data-ui-interaction-exception="Hidden form control preserves existing poll selection semantics." className="sr-only" name={pollFieldId} checked={Boolean(isSelected)} disabled={poll.isLocked} onChange={() => handleOptionClick(option.id)} onClick={() => { if (isSelected) handleOptionClick(option.id); }} />}
                </label>
                {/* Progress bar background */}
                {(userHasVoted || totalVotes > 0) && (
                  <div
                    className={`absolute top-0 left-0 bottom-0 ${isSelected ? "bg-primary/10" : "bg-muted"} transition-all duration-200 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150 ${isSelected ? "border-info-outline bg-primary" : "border-input group-hover:border-info-outline"}`}
                    >
                      {isSelected && (
                        <CheckCircle2 size={13} className="text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-sm ${isSelected ? "font-semibold text-info-content" : "font-medium text-foreground"}`}
                      >
                        {option.text}
                      </span>
                      {option.createdBy && (
                        <span className="text-xs text-muted-foreground font-semibold mt-0.5 uppercase tracking-wide">
                          Added by{" "}
                          {memberProfiles?.[option.createdBy]?.fullName ||
                            (option.createdBy == currentUser?.userId
                              ? "you"
                              : "User")}
                        </span>
                      )}
                    </div>
                  </div>

                  {(userHasVoted || totalVotes > 0) && (
                    <div className="flex items-center gap-2 shrink-0">
                      {!poll.anonymous && voteCount > 0 && (
                        <div className="flex -space-x-1 mr-1">
                          {option.votes?.slice(0, 3).map((vote, idx) => {
                            const profile =
                              vote.voterProfile ||
                              memberProfiles?.[vote.userId] ||
                              null;
                            return (
                              <Button variant="unstyled" type="button"
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (vote.userId !== currentUser?.userId) {
                                    onUserClick?.(vote.userId);
                                  }
                                }}
                                className={`relative z-30 w-5 h-5 rounded-full bg-accent border-2 border-border flex items-center justify-center overflow-hidden ${
                                  vote.userId !== currentUser?.userId
                                    ? "cursor-pointer hover:z-10"
                                    : ""
                                }`}
                                title={profile?.fullName || "User"}
                              >
                                {profile?.avatarUrl ? (
                                  <img
                                    src={profile.avatarUrl}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User size={10} className="text-muted-foreground" />
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                      <span className="rounded-md bg-info-soft px-1.5 py-0.5 text-xs font-semibold text-info-content">
                        {percentage}%
                      </span>
                      <span className="w-12 text-right text-xs font-semibold text-foreground">
                        {voteCount === 1 ? "1 vote" : `${voteCount} votes`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!poll.isLocked && poll.allowAddOptions && onAddOption && (
          <div className="mb-4">
            {isAddingOption ? (
              <form
                onSubmit={handleAddOptionSubmit}
                className="flex gap-2 animate-in fade-in slide-in-from-top-2"
              >
                <Input aria-label="Enter new option" unstyled
                  type="text"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  placeholder="Enter new option..."
                  className="flex-1 px-3.5 py-2 text-xs border border-input rounded-control outline-none transition"
                  autoFocus
                />
                <Button variant="default"
                  type="submit"
                  disabled={!newOptionText.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-control disabled:opacity-50 transition"
                >
                  Add
                </Button>
                <Button variant="secondary"
                  type="button"
                  onClick={() => {
                    setIsAddingOption(false);
                    setNewOptionText("");
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-control transition"
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <Button variant="unstyled"
                onClick={() => setIsAddingOption(true)}
                className="flex items-center justify-center gap-1.5 text-xs text-info-content font-semibold py-2.5 px-3 cursor-pointer rounded-control bg-background border border-border hover:bg-info-soft/50 hover:border-border transition-all duration-150 w-full"
              >
                <Plus size={15} />{" "}
                Add Poll Option
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3 mt-1.5">
          <div className="flex items-center gap-2">
            {!poll.anonymous && totalUniqueVoters > 0 ? (
              <Button variant="unstyled"
                type="button"
                onClick={() => setIsVotersModalOpen(true)}
                className="flex cursor-pointer items-center gap-1 rounded-control px-1.5 py-1 font-semibold text-info-content transition hover:bg-info-soft hover:text-info-content"
              >
                <Users size={14} />
                <span>
                  {totalUniqueVoters === 1
                    ? "1 voter"
                    : `${totalUniqueVoters} voters`}
                </span>
                <ChevronRight size={13} />
              </Button>
            ) : (
              <span className="font-semibold text-muted-foreground">
                {totalVotes === 1 ? "1 vote" : `${totalVotes} votes`}{" "}
                {poll.anonymous ? "(Anonymous)" : ""}
              </span>
            )}
            {poll.isLocked && (
              <span className="bg-destructive-soft text-destructive-content px-2 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wider">
                LOCKED
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {poll.multipleChoice && (
              <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-lg text-xs font-semibold">
                Multiple Choice
              </span>
            )}
            {poll.anonymous && (
              <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-lg text-xs font-semibold">
                Anonymous
              </span>
            )}
          </div>
        </div>
      </div>
      <EditPollModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        poll={poll}
        onSubmit={(data) => {
          onEditPoll?.(
            data.title,
            data.multipleChoice,
            data.allowAddOptions,
            data.anonymous,
            data.isLocked,
          );
        }}
      />
      <PollVotersModal
        isOpen={isVotersModalOpen}
        onClose={() => setIsVotersModalOpen(false)}
        poll={poll}
        onUserClick={onUserClick}
      />
    </div>
  );
});

export default PollMessage;
