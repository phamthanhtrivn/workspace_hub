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
    text = `${names[0]} is typing...`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing...`;
  } else if (names.length > 2) {
    text = `${names[0]}, ${names[1]} and ${names.length - 2} others are typing...`;
  }

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-info text-xs px-4 py-1 italic animate-in fade-in duration-200">
      <span>{text}</span>
      <div className="flex items-center gap-1">
        <span
          className="w-1 h-1 bg-primary rounded-full"

        ></span>
        <span
          className="w-1 h-1 bg-primary rounded-full"

        ></span>
        <span className="w-1 h-1 bg-primary rounded-full"></span>
      </div>
    </div>
  );
});
