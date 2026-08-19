"use client";

import { ChevronDown } from "lucide-react";

interface JumpToRecentBannerProps {
  /** Khi true: đang xem lịch sử cũ — hiện text "Jump to Recent" */
  isViewingHistory: boolean;
  onAction: () => void;
}

/**
 * Banner nổi ở cuối chat area.
 *
 * - Khi `isViewingHistory = true`: người dùng đang xem tin nhắn cũ → action là jump to recent.
 * - Khi `isViewingHistory = false`: người dùng chỉ scroll lên → action là scroll xuống cuối.
 *
 * Gộp cả hai trường hợp vào một component để tránh duplicate logic hiển thị.
 */
export default function JumpToRecentBanner({
  isViewingHistory,
  onAction,
}: JumpToRecentBannerProps) {
  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-bounce">
      <button
        onClick={onAction}
        className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-xs font-semibold whitespace-nowrap"
      >
        {isViewingHistory ? (
          <>
            <span>You are viewing older messages</span>
            <span className="bg-blue-500 hover:bg-blue-600 px-2 py-0.5 rounded-full text-[10px] transition-colors">
              Jump to Recent
            </span>
          </>
        ) : (
          <>
            <ChevronDown size={14} />
            <span>Scroll to latest</span>
          </>
        )}
      </button>
    </div>
  );
}
