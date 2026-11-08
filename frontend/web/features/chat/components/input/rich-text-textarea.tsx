"use client";

import { IconButton } from "@/components/ui/icon-button";

import React, { useId, useRef, useState } from "react";
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
  Eye,
} from "lucide-react";
import {
  FormattingType,
  useTextFormatting,
} from "../../hooks/input/useTextFormatting";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_FOCUS_CONTAINER_CLASS_NAME } from "@/components/ui/field-focus";
import { NOTE_EDITOR_LABELS } from "../../constants/note.constants";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import MessageComposerPreview from "./message-composer-preview";


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
  label = NOTE_EDITOR_LABELS.content,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  value,
  setValue,
  placeholder,
  minHeightClassName = "min-h-[160px]",
}: RichTextTextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const previewId = `${textareaId}-preview`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const memberProfiles = useChatMemberProfiles();
  const { applyFormatting, handleListKeyDown } = useTextFormatting({
    message: value,
    setMessage: setValue,
    textareaRef,
  });

  const togglePreview = () => {
    setShowPreview(!showPreview);
    if (showPreview) {
      requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
    }
  };

  return (
    <div
      data-invalid={invalid === true || invalid === "true" || undefined}
      className={`${FIELD_FOCUS_CONTAINER_CLASS_NAME} overflow-hidden rounded-panel border border-input bg-card transition-all focus-within:[box-shadow:none]! focus-within:after:pointer-events-none focus-within:after:absolute focus-within:after:inset-0 focus-within:after:z-1 focus-within:after:rounded-[inherit] focus-within:after:border focus-within:after:border-ring focus-within:after:content-[''] [@media(forced-colors:active)]:focus-within:after:border-[Highlight]`}
    >
      <div className="flex items-start gap-2 border-b border-border bg-background px-2 py-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5">
          {FORMAT_BUTTONS.map(({ type, label, icon: Icon }, index) => (
            <React.Fragment key={type}>
              {index === 3 ? <div className="mx-1 h-4 w-px bg-accent" /> : null}
              <IconButton label={label} showTooltip={false} size="icon-sm"
                type="button"
                disabled={showPreview}
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
        <IconButton
          label={showPreview ? NOTE_EDITOR_LABELS.edit : NOTE_EDITOR_LABELS.preview}
          title={showPreview ? NOTE_EDITOR_LABELS.edit : NOTE_EDITOR_LABELS.preview}
          showTooltip={false}
          size="icon-sm"
          variant={showPreview ? "info-soft" : "ghost"}
          aria-pressed={showPreview}
          aria-expanded={showPreview}
          aria-controls={showPreview ? previewId : undefined}
          disabled={!value.trim()}
          onClick={togglePreview}
          className="shrink-0 text-muted-foreground aria-pressed:text-info-content"
        >
          <Eye size={16} aria-hidden="true" />
        </IconButton>
      </div>
      <MessageComposerPreview
        id={previewId}
        label={NOTE_EDITOR_LABELS.previewRegion}
        message={value}
        memberProfiles={memberProfiles}
        open={showPreview}
        contentClassName={`max-h-[min(20rem,40dvh)] px-4 py-3 font-normal focus-visible:ring-0 ${minHeightClassName}`}
      >
        <Textarea unstyled
          focusMode="container"
          id={textareaId}
          aria-label={labelledBy ? undefined : label}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleListKeyDown}
          placeholder={placeholder}
          className={`block w-full resize-none bg-card px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground ${minHeightClassName}`}
          required
        />
      </MessageComposerPreview>
    </div>
  );
}
