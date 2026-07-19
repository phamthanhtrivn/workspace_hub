import React, { useEffect, useRef } from "react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";

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
      className="absolute bottom-[110%] right-0 z-50 animate-in fade-in zoom-in-95 duration-200 shadow-xl rounded-xl overflow-hidden border border-gray-200 bg-white"
    >
      <EmojiPicker
        onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
        theme={Theme.LIGHT}
        emojiStyle={EmojiStyle.NATIVE}
        lazyLoadEmojis={true}
        searchPlaceHolder="Tìm kiếm emoji..."
      />
    </div>
  );
};

export default EmojiPickerPopover;
