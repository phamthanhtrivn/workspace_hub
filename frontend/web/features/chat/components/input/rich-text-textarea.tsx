"use client";
import {
  MarkdownNoteEditor,
  type MarkdownNoteEditorProps,
} from "@/components/notes/markdown-note-editor";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { renderMessageContent } from "../../utils/message-formatter";
export default function RichTextTextarea(
  props: Omit<MarkdownNoteEditorProps, "renderPreview">,
) {
  const profiles = useChatMemberProfiles();

  return (
    <MarkdownNoteEditor
      {...props}
      renderPreview={(content) => renderMessageContent(content, profiles)}
    />
  );
}
