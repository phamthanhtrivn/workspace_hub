"use client";

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
import EditPollModal from "../modals/edit-poll-modal";
import PollVotersModal from "../modals/poll-voters-modal";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { PollResponse } from "../../types/chat.types";

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
  const currentUser = useAppSelector((state) => state.auth);
  const memberProfiles = useChatMemberProfiles();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVotersModalOpen, setIsVotersModalOpen] = useState(false);

  if (!poll || !poll.options) {
    return (
      <div className="text-gray-500 italic p-4">Poll unavailable</div>
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
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] max-w-md w-full relative overflow-hidden transition-all duration-350 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div className="flex items-start gap-3.5 mb-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600 mt-1 border border-blue-100/50">
              <BarChart2 size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-[17px] leading-snug tracking-tight mb-1">
                {poll.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>Created by</span>
                <span className="font-semibold text-slate-600">
                  <span
                    className={`font-semibold ${!isMe ? "cursor-pointer hover:underline" : ""}`}
                    onClick={() => {
                      if (!isMe) onUserClick?.(poll.createdBy);
                    }}
                  >
                    {isMe
                      ? "You"
                      : creatorProfile?.fullName ||
                        creatorProfile?.email ||
                        "User"}
                  </span>
                </span>
                <span>-</span>
                <span>{formatDateTime(poll.createdAt)}</span>
              </div>
            </div>
          </div>
          {isMe && onEditPoll && !poll.isLocked && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="cursor-pointer p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex-shrink-0"
              title="Edit poll"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>

        <div className="space-y-2.5 mb-4">
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
                onClick={() => handleOptionClick(option.id)}
                className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${isSelected ? "border-blue-500 bg-blue-50/20" : "border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300"} ${!poll.isLocked ? "cursor-pointer" : ""} group`}
              >
                {/* Progress bar background */}
                {(userHasVoted || totalVotes > 0) && (
                  <div
                    className={`absolute top-0 left-0 bottom-0 ${isSelected ? "bg-blue-500/10" : "bg-slate-100/70"} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative p-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150 ${isSelected ? "border-blue-600 bg-blue-600 shadow-sm shadow-blue-600/20" : "border-slate-300 group-hover:border-blue-400"}`}
                    >
                      {isSelected && (
                        <CheckCircle2 size={13} className="text-white" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span
                        className={`text-sm ${isSelected ? "font-bold text-blue-950" : "font-medium text-slate-700"}`}
                      >
                        {option.text}
                      </span>
                      {option.createdBy && (
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                          Added by:{" "}
                          {memberProfiles?.[option.createdBy]?.fullName ||
                            (option.createdBy == currentUser?.userId
                              ? "You"
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
                              <div
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (vote.userId !== currentUser?.userId) {
                                    onUserClick?.(vote.userId);
                                  }
                                }}
                                className={`w-5 h-5 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden ${
                                  vote.userId !== currentUser?.userId
                                    ? "cursor-pointer hover:z-10 hover:scale-105"
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
                                  <User size={10} className="text-slate-400" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-extrabold text-blue-700">
                        {percentage}%
                      </span>
                      <span className="w-12 text-right text-xs font-extrabold text-slate-800">
                        {voteCount} {voteCount === 1 ? "vote" : "votes"}
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
                <input
                  type="text"
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                  placeholder="Enter new option..."
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-200 focus:border-blue-500 rounded-xl outline-none transition"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newOptionText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingOption(false);
                    setNewOptionText("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingOption(true)}
                className="flex items-center justify-center gap-1.5 text-xs text-blue-600 font-bold py-2.5 px-3 cursor-pointer rounded-xl bg-slate-50 border border-slate-200/50 hover:bg-blue-50/50 hover:border-blue-200/50 transition-all duration-150 w-full"
              >
                <Plus size={15} /> Add poll option
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3 mt-1.5">
          <div className="flex items-center gap-2">
            {!poll.anonymous && totalUniqueVoters > 0 ? (
              <button
                type="button"
                onClick={() => setIsVotersModalOpen(true)}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1 font-bold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <Users size={14} />
                <span>
                  {totalUniqueVoters}{" "}
                  {totalUniqueVoters === 1 ? "voter" : "voters"}
                </span>
                <ChevronRight size={13} />
              </button>
            ) : (
              <span className="font-bold text-slate-600">
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}{" "}
                {poll.anonymous ? "(Anonymous)" : ""}
              </span>
            )}
            {poll.isLocked && (
              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                Locked
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {poll.multipleChoice && (
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-bold">Multiple choices</span>
            )}
            {poll.anonymous && (
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-bold">Anonymous</span>
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
