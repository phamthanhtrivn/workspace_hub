import React, { useState } from "react";
import { Pin, ChevronDown, ChevronUp, X } from "lucide-react";

interface PinnedMessagesBarProps {
  pinnedMessages: any[];
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  currentUserId: string;
}

export const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = React.memo(
  ({ pinnedMessages, onJumpToMessage, onUnpin, currentUserId }) => {
    const [expanded, setExpanded] = useState(false);

    if (!pinnedMessages || pinnedMessages.length === 0) return null;

    // Render a single pinned message
    const renderMessage = (msg: any) => {
      let contentText = msg.content || "";
      if (!contentText) {
        if (msg.medias && msg.medias.length > 0) {
          contentText = "[Đính kèm]";
        } else if (msg.poll) {
          contentText = "[Cuộc bình chọn]";
        } else if (msg.note) {
          contentText = "[Ghi chú]";
        }
      }

      return (
        <div
          key={msg.id}
          className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
          onClick={() => {
            setExpanded(false);
            onJumpToMessage(msg.id);
          }}
        >
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-full flex-shrink-0">
              <Pin size={14} />
            </div>
            <div className="flex flex-col overflow-hidden text-sm w-full">
              <span className="font-medium text-gray-900 truncate">
                Tin nhắn ghim
              </span>
              <span className="text-gray-500 truncate">{contentText}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(msg.id);
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Bỏ ghim"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      );
    };

    // If there's only 1 message, just render it without accordion
    if (pinnedMessages.length === 1) {
      return (
        <div className="bg-white border-b border-gray-200 shadow-sm flex flex-col z-10">
          {renderMessage(pinnedMessages[0])}
        </div>
      );
    }

    // If multiple, show the most recent one (index 0) and allow expanding
    const topMessage = pinnedMessages[0];
    let topContentText = topMessage.content || "";
    if (!topContentText) {
      if (topMessage.medias && topMessage.medias.length > 0) {
        topContentText = "[Đính kèm]";
      } else if (topMessage.poll) {
        topContentText = "[Cuộc bình chọn]";
      } else if (topMessage.note) {
        topContentText = "[Ghi chú]";
      }
    }

    return (
      <div className="bg-white border-b border-gray-200 shadow-sm flex flex-col z-10 relative">
        {!expanded ? (
          <div
            className="flex items-center justify-between p-2 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => setExpanded(true)}
          >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-full flex-shrink-0">
                <Pin size={14} />
              </div>
              <div className="flex flex-col overflow-hidden text-sm w-full">
                <span className="font-medium text-gray-900 truncate">
                  {pinnedMessages.length} tin nhắn ghim
                </span>
                <span className="text-gray-500 truncate">{topContentText}</span>
              </div>
            </div>
            <button className="p-1.5 text-gray-500 rounded-md">
              <ChevronDown size={20} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div
              className="flex items-center justify-between p-2 bg-gray-50 cursor-pointer border-b border-gray-200"
              onClick={() => setExpanded(false)}
            >
              <div className="text-sm font-medium text-gray-700 ml-2">
                Danh sách tin nhắn ghim ({pinnedMessages.length})
              </div>
              <button className="p-1.5 text-gray-500 rounded-md">
                <ChevronUp size={20} />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {pinnedMessages.map(renderMessage)}
            </div>
          </div>
        )}
      </div>
    );
  },
);
