import React, { useEffect, useRef } from "react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { useTheme } from "next-themes";

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute max-h-[min(420px,60dvh)] max-w-[calc(100vw-1.5rem)] overflow-y-auto bottom-[110%] right-0 z-50 animate-in fade-in zoom-in-95 duration-200 rounded-panel overflow-hidden border border-border bg-card shadow-panel"
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
    </div>
  );
};

export default EmojiPickerPopover;
