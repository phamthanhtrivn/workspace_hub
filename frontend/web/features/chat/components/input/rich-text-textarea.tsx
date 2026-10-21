"use client";

import { IconButton } from "@/components/ui/icon-button";

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
} from "../../hooks/input/useTextFormatting";
import { Textarea } from "@/components/ui/textarea";


interface RichTextTextareaProps {
  id?: string;
  label?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
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
  id,
  label = "Message content",
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  value,
  setValue,
  placeholder,
  minHeightClassName = "min-h-[160px]",
  focusColorClassName = "focus-within:border-warning-outline focus-within:ring-warning-outline/20",
}: RichTextTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { applyFormatting, handleListKeyDown } = useTextFormatting({
    message: value,
    setMessage: setValue,
    textareaRef,
  });

  return (
    <div
      className={`overflow-hidden rounded-panel border border-input bg-card transition-all focus-within:ring-4 ${focusColorClassName}`}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background px-2 py-1.5">
        {FORMAT_BUTTONS.map(({ type, label, icon: Icon }, index) => (
          <React.Fragment key={type}>
            {index === 3 ? <div className="mx-1 h-4 w-px bg-accent" /> : null}
            <IconButton label={label} showTooltip={false} size="icon-sm"
              type="button"
              onClick={() => applyFormatting(type)}
              className="cursor-pointer rounded-control p-1.5 text-muted-foreground transition hover:bg-card hover:text-foreground"
              title={label}
              aria-label={label}
            >
              <Icon size={15} />
            </IconButton>
          </React.Fragment>
        ))}
      </div>
      <Textarea unstyled
        id={id}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleListKeyDown}
        placeholder={placeholder}
        className={`w-full resize-none bg-card px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground ${minHeightClassName}`}
        required
      />
    </div>
  );
}
