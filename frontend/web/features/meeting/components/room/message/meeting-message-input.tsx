"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { Folder, Loader2, Paperclip, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
import MyFilesSelectModal from "@/features/chat/components/modals/shared/my-files-select-modal";
import { formatFileSize } from "@/lib/file";
import {
  getMeetingMediaPresignedUrls,
  uploadMeetingMediaToS3,
} from "../../../api/meeting.api";
import type {
  MeetingMessageMediaPayload,
  MeetingMessageResponse,
} from "../../../types/meeting.types";
import { MeetingTextarea } from "../../ui/meeting-form-controls";
import { MeetingIconButton } from "../../ui/meeting-icon-button";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface UploadingMeetingMedia extends MeetingMessageMediaPayload {
  id: string;
  file: File;
  status: "uploading" | "success" | "error";
}

interface MeetingMessageInputProps {
  meetingId: string;
  editingMessage: MeetingMessageResponse | null;
  onSubmit: (
    content: string,
    medias?: MeetingMessageMediaPayload[],
  ) => Promise<boolean>;
  onCancelEdit: () => void;
}

export interface MeetingMessageInputRef {
  focus: () => void;
  reset: () => void;
  setMessage: (content: string) => void;
}

export const MeetingMessageInput = forwardRef<
  MeetingMessageInputRef,
  MeetingMessageInputProps
>(function MeetingMessageInput(
  { meetingId, editingMessage, onSubmit, onCancelEdit },
  ref,
) {
  const [message, setMessage] = useState(editingMessage?.content ?? "");
  const [uploads, setUploads] = useState<UploadingMeetingMedia[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isAttachOptionsOpen, setIsAttachOptionsOpen] = useState(false);
  const [isMyFilesModalOpen, setIsMyFilesModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isUploading = uploads.some((upload) => upload.status === "uploading");

  const resetComposer = useCallback(() => {
    setMessage("");
    setUploads([]);
    setIsEmojiOpen(false);
    setIsAttachOptionsOpen(false);
    setIsMyFilesModalOpen(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
      reset: resetComposer,
      setMessage: (content: string) => {
        setMessage(content);
        setUploads([]);
        setIsEmojiOpen(false);
        setIsAttachOptionsOpen(false);
        setIsMyFilesModalOpen(false);
      },
    }),
    [resetComposer],
  );

  useEffect(() => {
    if (!editingMessage) return;

    setIsAttachOptionsOpen(false);
    setIsMyFilesModalOpen(false);
  }, [editingMessage]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [message]);

  useEffect(() => {
    if (!isEmojiOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        emojiPickerRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsEmojiOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEmojiOpen]);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);
      if (validFiles.length !== files.length) {
        toast.error("Some files are larger than 100 MB");
      }
      if (validFiles.length === 0) return;

      const nextUploads = validFiles.map<UploadingMeetingMedia>((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        s3Key: "",
        status: "uploading",
      }));

      setUploads((current) => [...current, ...nextUploads]);

      try {
        const presignedUrls = await getMeetingMediaPresignedUrls({
          meetingId,
          files: nextUploads.map((upload) => ({
            fileName: upload.name,
            mimeType: upload.mimeType,
            sizeBytes: upload.sizeBytes,
          })),
        });

        await Promise.all(
          nextUploads.map(async (upload, index) => {
            const presigned = presignedUrls[index];
            const success = await uploadMeetingMediaToS3(
              upload.file,
              presigned.presignedUrl,
            );

            setUploads((current) =>
              current.map((item) =>
                item.id === upload.id
                  ? {
                      ...item,
                      s3Key: presigned.s3Key,
                      status: success ? "success" : "error",
                    }
                  : item,
              ),
            );
          }),
        );
      } catch {
        setUploads((current) =>
          current.map((item) =>
            nextUploads.some((upload) => upload.id === item.id)
              ? { ...item, status: "error" }
              : item,
          ),
        );
        toast.error("Could not upload file");
      }
    },
    [meetingId],
  );

  const handleSelectMyFiles = useCallback(
    (
      files: Array<{
        name: string;
        s3Key: string;
        mimeType: string;
        sizeBytes: number;
      }>,
    ) => {
      const nextUploads = files.map<UploadingMeetingMedia>((file) => ({
        id: `${file.s3Key}-${Date.now()}-${Math.random()}`,
        file: new File([], file.name, { type: file.mimeType }),
        name: file.name,
        s3Key: file.s3Key,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        status: "success",
      }));

      setUploads((current) => [...current, ...nextUploads]);
    },
    [],
  );

  const handleSubmit = async () => {
    if (isUploading) {
      toast.warning("Please wait for uploads to finish");
      return;
    }

    const successfulUploads = uploads.filter(
      (upload) => upload.status === "success",
    );
    const mediaPayload = successfulUploads.map((upload) => ({
      name: upload.name,
      s3Key: upload.s3Key,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
    }));
    const trimmedMessage = message.trim();

    if (editingMessage && !trimmedMessage) return;
    if (!editingMessage && !trimmedMessage && mediaPayload.length === 0) return;

    const isSubmitted = await onSubmit(
      trimmedMessage,
      !editingMessage && mediaPayload.length > 0 ? mediaPayload : undefined,
    );
    if (!editingMessage && isSubmitted) {
      resetComposer();
    }
  };

  return (
    <div className="relative border-t border-white/10 p-3 mt-2">
      {uploads.length > 0 && (
        <div className="mb-2 flex max-h-24 flex-col gap-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-300"
            >
              <span className="min-w-0 flex-1 truncate">
                {upload.name} - {formatFileSize(upload.sizeBytes)}
              </span>
              {upload.status === "uploading" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-300" />
              ) : (
                <MeetingIconButton
                  label="Remove upload"
                  icon={X}
                  onClick={() =>
                    setUploads((current) =>
                      current.filter((item) => item.id !== upload.id),
                    )
                  }
                  className="size-6 p-0 text-slate-300 hover:bg-white/10"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {isEmojiOpen && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-full left-3 right-3 z-[90] mb-2 overflow-hidden rounded-lg border border-white/10 bg-[#111827] shadow-2xl"
        >
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              setMessage((current) => `${current}${emojiData.emoji}`);
              setIsEmojiOpen(false);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.NATIVE}
            lazyLoadEmojis
            width="100%"
            height={340}
            searchPlaceHolder="Search emoji..."
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/25 p-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void uploadFiles(files);
          }}
          disabled={Boolean(editingMessage)}
        />

        {!editingMessage && (
          <div className="relative shrink-0">
            <MeetingIconButton
              label="Attach options"
              icon={Paperclip}
              disabled={isUploading}
              onClick={() => setIsAttachOptionsOpen((value) => !value)}
              className="size-9 text-slate-300 hover:bg-white/10"
            />

            {isAttachOptionsOpen && (
              <div className="absolute bottom-full left-0 z-[95] mb-2 flex min-w-40 flex-col gap-1 rounded-xl border border-white/10 bg-[#111827] p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachOptionsOpen(false);
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Paperclip className="h-4 w-4 text-slate-400" />
                  Files
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachOptionsOpen(false);
                    setIsMyFilesModalOpen(true);
                  }}
                  disabled={isUploading}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Folder className="h-4 w-4 text-sky-300" />
                  My files
                </button>
              </div>
            )}
          </div>
        )}

        <MeetingTextarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Message..."
          rows={1}
          className="max-h-32 min-h-9 flex-1 border-0 bg-transparent px-1 py-2 text-sm font-semibold leading-5 text-slate-100 shadow-none placeholder:text-slate-500 focus-visible:ring-0"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
            if (event.key === "Escape" && editingMessage) {
              onCancelEdit();
            }
          }}
        />

        <MeetingIconButton
          ref={emojiButtonRef}
          label="Insert emoji"
          icon={Smile}
          onClick={() => setIsEmojiOpen((value) => !value)}
          className="size-9 shrink-0 text-slate-300 hover:bg-white/10"
        />

        <MeetingIconButton
          label="Send message"
          icon={Send}
          onClick={() => void handleSubmit()}
          disabled={
            isUploading ||
            (editingMessage
              ? !message.trim()
              : !message.trim() &&
                uploads.every((upload) => upload.status !== "success"))
          }
          className="size-9 shrink-0 bg-sky-500 text-white hover:bg-sky-400 disabled:bg-white/10 disabled:text-slate-500"
        />
      </div>

      <MyFilesSelectModal
        isOpen={isMyFilesModalOpen}
        onClose={() => setIsMyFilesModalOpen(false)}
        overlayClassName="z-[150]"
        tone="dark"
        onSelect={handleSelectMyFiles}
      />
    </div>
  );
});

MeetingMessageInput.displayName = "MeetingMessageInput";
