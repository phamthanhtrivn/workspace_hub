"use client";
import { NoteEditorDialog } from "@/components/notes/note-editor-dialog";
import type {
  NoteDraft,
  NoteSaveResult,
} from "@/components/notes/note.constants";
import { useChatMemberProfiles } from "../../../hooks/useChatMemberProfiles";
import { renderMessageContent } from "../../../utils/message-formatter";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: NoteDraft) => NoteSaveResult | Promise<NoteSaveResult>;
}
function CreateNoteForm({ onClose, onSubmit }: Props) {
  const profiles = useChatMemberProfiles();

  return (
    <NoteEditorDialog
      onClose={onClose}
      onSave={onSubmit}
      renderPreview={(content) => renderMessageContent(content, profiles)}
    />
  );
}
export default function CreateNoteModal(props: Props) {
  return props.isOpen ? <CreateNoteForm {...props} /> : null;
}
