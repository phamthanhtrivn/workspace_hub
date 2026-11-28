"use client";
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog";
import type { NoteSaveResult } from "@/components/notes/note.constants";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { renderMessageContent } from "../../../utils/message-formatter";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  initialContent: string;
  onSave: (
    title: string,
    content: string,
  ) => NoteSaveResult | Promise<NoteSaveResult>;
}
function EditNoteForm({
  onClose,
  onSave,
  initialTitle,
  initialContent,
}: Props) {
  const profiles = useChatMemberProfiles();

  return (
    <NoteEditorDialog
      editing
      initialTitle={initialTitle}
      initialContent={initialContent}
      onClose={onClose}
      onSave={(draft) => onSave(draft.title, draft.content)}
      renderPreview={(content) => renderMessageContent(content, profiles)}
    />
  );
}
export default function EditNoteModal(props: Props) {
  return props.isOpen ? <EditNoteForm {...props} /> : null;
}
