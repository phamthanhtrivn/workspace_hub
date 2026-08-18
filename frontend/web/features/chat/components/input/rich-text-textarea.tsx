"use client";

import React, { useRef } from "react";
import {
  Bold,
  Code,
  Heading,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import {
  FormattingType,
  useTextFormatting,
} from "../../hooks/useTextFormatting";

interface RichTextTextareaProps {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  placeholder?: string;
  minHeightClassName?: string;
  focusColorClassName?: string;
}

const FORMAT_BUTTONS: Array<{
  type: FormattingType;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  { type: "bold", label: "Bold", icon: Bold },
  { type: "italic", label: "Italic", icon: Italic },
  { type: "strikethrough", label: "Strikethrough", icon: Strikethrough },
  { type: "heading", label: "Heading", icon: Heading },
  { type: "link", label: "Link", icon: Link },
  { type: "code", label: "Code block", icon: Code },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "bullet", label: "Bulleted list", icon: List },
  { type: "number", label: "Numbered list", icon: ListOrdered },
];

export default function RichTextTextarea({
  value,
  setValue,
  placeholder,
  minHeightClassName = "min-h-[160px]",
  focusColorClassName = "focus-within:border-amber-500 focus-within:ring-amber-500/20",
}: RichTextTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { applyFormatting, handleListKeyDown } = useTextFormatting({
    message: value,
    setMessage: setValue,
    textareaRef,
  });

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-300 bg-white transition-all focus-within:ring-4 ${focusColorClassName}`}
    >
      <div className="flex items-center gap-0.5 border-b border-gray-100 bg-gray-50/80 px-2 py-1.5">
        {FORMAT_BUTTONS.map(({ type, label, icon: Icon }, index) => (
          <React.Fragment key={type}>
            {index === 3 ? (
              <div className="mx-1 h-4 w-px bg-gray-200" />
            ) : null}
            <button
              type="button"
              onClick={() => applyFormatting(type)}
              className="cursor-pointer rounded-md p-1.5 text-gray-500 transition hover:bg-white hover:text-gray-900 hover:shadow-sm"
              title={label}
              aria-label={label}
            >
              <Icon size={15} />
            </button>
          </React.Fragment>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleListKeyDown}
        placeholder={placeholder}
        className={`w-full resize-none bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 outline-none placeholder:text-gray-400 ${minHeightClassName}`}
        required
      />
    </div>
  );
}
