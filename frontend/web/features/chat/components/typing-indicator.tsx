"use client";

import React from "react";

interface TypingIndicatorProps {
  typingUsers: { id: string; name: string }[];
}

export default React.memo(function TypingIndicator({
  typingUsers,
}: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.name);
  let text = "";
  if (names.length === 1) {
    text = `${names[0]} đang soạn tin nhắn`;
  } else if (names.length === 2) {
    text = `${names[0]} và ${names[1]} đang soạn tin nhắn`;
  } else if (names.length > 2) {
    text = `${names[0]}, ${names[1]} và ${names.length - 2} người khác đang soạn tin nhắn`;
  }

  return (
    <div className="flex items-center gap-2 text-blue-500 text-xs px-4 py-1 italic animate-in fade-in duration-300">
      <span>{text}</span>
      <div className="flex items-center gap-1">
        <span
          className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
          style={{ animationDelay: "-0.3s" }}
        ></span>
        <span
          className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
          style={{ animationDelay: "-0.15s" }}
        ></span>
        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
      </div>
    </div>
  );
});
