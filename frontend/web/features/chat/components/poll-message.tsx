"use client";

import React, { useState } from "react";
import {
  BarChart2,
  Users,
  CheckCircle2,
  User,
  Plus,
  Edit2,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { formatDividerTime } from "@/lib/date";
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "../api/chat.api";
import EditPollModal from "./edit-poll-modal";

interface PollOption {
  id: string;
  text: string;
  createdBy?: string;
  votes?: { userId: string }[];
}

interface PollMessageProps {
  poll: {
    id: string;
    title: string;
    multipleChoice: boolean;
    allowAddOptions: boolean;
    anonymous: boolean;
    isLocked?: boolean;
    createdBy: string;
    createdAt: string;
    options: PollOption[];
  };
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
  const memberProfiles = useAppSelector((state) => state.chat.memberProfiles);

  if (!poll || !poll.options) {
    return (
      <div className="text-gray-500 italic p-4">Bình chọn không khả dụng</div>
    );
  }

  const { data: creatorProfile } = useQuery({
    queryKey: ["userProfile", poll.createdBy],
    queryFn: () => getPublicProfile(poll.createdBy),
    enabled: !!poll.createdBy,
    staleTime: 5 * 60 * 1000,
  });

  const isMe = poll.createdBy === currentUser?.userId;

  const totalVotes = poll.options.reduce(
    (sum, opt) => sum + (opt.votes?.length || 0),
    0,
  );
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm max-w-md w-full">
        <div className="flex items-start gap-3 mb-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 mt-1">
              <BarChart2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">
                {poll.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Tạo bởi</span>
                <span className="font-medium">
                  <span
                    className={`font-medium ${!isMe ? "cursor-pointer hover:underline" : ""}`}
                    onClick={() => {
                      if (!isMe) onUserClick?.(poll.createdBy);
                    }}
                  >
                    {isMe
                      ? "Bạn"
                      : creatorProfile?.data?.fullName || "Người dùng"}
                  </span>
                </span>
                <span>•</span>
                <span>{formatDividerTime(new Date(poll.createdAt))}</span>
              </div>
            </div>
          </div>
          {isMe && onEditPoll && !poll.isLocked && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="cursor-pointer p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
              title="Chỉnh sửa bình chọn"
            >
              <Edit2 size={18} />
            </button>
          )}
        </div>

        <div className="space-y-3 mb-4">
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
                className={`relative overflow-hidden rounded-xl border ${isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:bg-gray-50"} transition-all ${!poll.isLocked ? "cursor-pointer" : ""} group`}
              >
                {/* Progress bar background */}
                {(userHasVoted || totalVotes > 0) && (
                  <div
                    className={`absolute top-0 left-0 bottom-0 ${isSelected ? "bg-purple-200/50" : "bg-gray-100"} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative p-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-purple-600 bg-purple-600" : "border-gray-300 group-hover:border-purple-400"}`}
                    >
                      {isSelected && (
                        <CheckCircle2 size={14} className="text-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-sm ${isSelected ? "font-medium text-purple-900" : "text-gray-700"}`}
                      >
                        {option.text}
                      </span>
                      {option.createdBy && (
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          Thêm bởi:{" "}
                          {memberProfiles?.[option.createdBy]?.fullName ||
                            (option.createdBy == currentUser?.userId
                              ? "Bạn"
                              : "Người dùng")}
                        </span>
                      )}
                    </div>
                  </div>

                  {(userHasVoted || totalVotes > 0) && (
                    <div className="flex items-center gap-2">
                      {!poll.anonymous && voteCount > 0 && (
                        <div className="flex -space-x-1 mr-1">
                          {option.votes?.slice(0, 3).map((vote, idx) => {
                            const profile = memberProfiles?.[vote.userId];
                            return (
                              <div
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (vote.userId !== currentUser?.userId) {
                                    onUserClick?.(vote.userId);
                                  }
                                }}
                                className={`w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center overflow-hidden ${
                                  vote.userId !== currentUser?.userId
                                    ? "cursor-pointer hover:z-10"
                                    : ""
                                }`}
                                title={profile?.fullName || "Người dùng"}
                              >
                                {profile?.avatarUrl ? (
                                  <img
                                    src={profile.avatarUrl}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User size={12} className="text-gray-400" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-600">
                        {percentage}%
                      </span>
                      <span className="text-xs text-gray-400 w-8 text-right">
                        {voteCount}
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
                  placeholder="Nhập phương án mới..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newOptionText.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Thêm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingOption(false);
                    setNewOptionText("");
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  Huỷ
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingOption(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium py-2 px-3 cursor-pointer rounded-lg hover:bg-blue-50 transition-colors w-full"
              >
                <Plus size={16} /> Thêm phương án
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            <span>
              {totalVotes} lượt bình chọn {poll.anonymous ? "(Ẩn danh)" : ""}
            </span>
            {poll.isLocked && (
              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">
                Đã khóa
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {poll.multipleChoice && (
              <span className="bg-gray-100 px-2 py-1 rounded">Chọn nhiều</span>
            )}
            {poll.anonymous && (
              <span className="bg-gray-100 px-2 py-1 rounded">Ẩn danh</span>
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
    </div>
  );
});

export default PollMessage;
