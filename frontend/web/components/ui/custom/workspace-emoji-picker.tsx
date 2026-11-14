"use client";

import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { APPEARANCE_COPY } from "./appearance.constants";

export default function WorkspaceEmojiPicker({
  onSelect,
}: {
  onSelect: (emoji: string) => void;
}) {
  const { resolvedTheme } = useTheme();

  return (
    <EmojiPicker
      onEmojiClick={(emoji) => onSelect(emoji.emoji)}
      theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
      emojiStyle={EmojiStyle.NATIVE}
      width="100%"
      height="min(400px, 65dvh)"
      searchPlaceholder={APPEARANCE_COPY.searchIcons}
      previewConfig={{ showPreview: false }}
      lazyLoadEmojis
    />
  );
}
