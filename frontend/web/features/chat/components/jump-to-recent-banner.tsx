"use client";

import { ChevronDown } from "lucide-react";

interface JumpToRecentBannerProps {
  onJumpToRecent: () => void;
}

/**
 * Banner nổi hiển thị khi người dùng đang xem lịch sử tin nhắn cũ.
 * Click để quay về tin nhắn mới nhất.
 */
export default function JumpToRecentBanner({
  onJumpToRecent,
}: JumpToRecentBannerProps) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-bounce">
      <button
        onClick={onJumpToRecent}
        className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-xs font-semibold whitespace-nowrap"
      >
        <span>You are viewing older messages</span>
        <span className="bg-blue-500 hover:bg-blue-600 px-2 py-0.5 rounded-full text-[10px] transition-colors">
          Jump to Recent
        </span>
      </button>
    </div>
  );
}

interface ScrollToBottomButtonProps {
  onClick: () => void;
}

/**
 * Nút mũi tên xuống hiển thị khi người dùng scroll lên và không đang jump.
 */
export function ScrollToBottomButton({ onClick }: ScrollToBottomButtonProps) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-30 cursor-pointer shadow-2xl right-6 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center bg-blue-500 text-white hover:text-gray-50 hover:bg-blue-700 transition z-10"
    >
      <ChevronDown size={24} />
    </button>
  );
}
