import React, { useRef } from "react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { useTheme } from "next-themes";
import { AnchoredPopover } from "@/components/ui/anchored-popup";

interface EmojiPickerPopoverProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  onEmojiSelect,
  isOpen,
  onClose,
  triggerRef,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();



  if (!isOpen) return null;

  return (
    <AnchoredPopover onClose={onClose} anchorElementRef={triggerRef} side="top" align="end" aria-label="Message emoji"
      ref={popoverRef}
      className="max-h-[min(420px,60dvh)] max-w-[calc(100vw-1.5rem)] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200 rounded-panel overflow-hidden border border-border bg-card shadow-panel"
    >
      <EmojiPicker
        onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
        theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
        emojiStyle={EmojiStyle.NATIVE}
        width="min(350px, calc(100vw - 1.5rem))"
        height="min(420px, 60dvh)"
        lazyLoadEmojis={true}
        searchPlaceHolder="Search emoji..."
      />
    </AnchoredPopover>
  );
};

export default EmojiPickerPopover;
