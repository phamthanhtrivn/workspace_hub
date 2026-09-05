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
import { Loader2, Paperclip, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { formatFileSize } from "@/lib/file";
import {
  getMeetingMediaPresignedUrls,
  uploadMeetingMediaToS3,
} from "../../../api/meeting.api";
import type {
  MeetingMessageMediaPayload,
  MeetingMessageResponse,
} from "../../../types/meeting.types";

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
  const intl = useAppIntl();
  const [message, setMessage] = useState(editingMessage?.content ?? "");
  const [uploads, setUploads] = useState<UploadingMeetingMedia[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const isUploading = uploads.some((upload) => upload.status === "uploading");

  const resetComposer = useCallback(() => {
    setMessage("");
    setUploads([]);
    setIsEmojiOpen(false);
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
      },
    }),
    [resetComposer],
  );

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
        toast.error(intl.formatMessage({ id: "meeting.chat.fileTooLarge" }));
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
        toast.error(intl.formatMessage({ id: "meeting.chat.failedUpload" }));
      }
    },
    [intl, meetingId],
  );

  const handleSubmit = async () => {
    if (isUploading) {
      toast.warning(intl.formatMessage({ id: "meeting.chat.waitForUpload" }));
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
                <button
                  type="button"
                  onClick={() =>
                    setUploads((current) =>
                      current.filter((item) => item.id !== upload.id),
                    )
                  }
                  className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-md hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
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
            searchPlaceHolder={intl.formatMessage({
              id: "meeting.chat.searchEmoji",
            })}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            title={intl.formatMessage({ id: "meeting.chat.attachFile" })}
          >
            <Paperclip className="h-4 w-4" />
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={intl.formatMessage({ id: "meeting.chat.placeholder" })}
          rows={1}
          className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm font-semibold leading-5 text-slate-100 outline-none placeholder:text-slate-500"
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

        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setIsEmojiOpen((value) => !value)}
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-300 transition hover:bg-white/10"
          title={intl.formatMessage({ id: "meeting.chat.insertEmoji" })}
        >
          <Smile className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            isUploading ||
            (editingMessage
              ? !message.trim()
              : !message.trim() &&
                uploads.every((upload) => upload.status !== "success"))
          }
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg bg-sky-500 text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
          title={intl.formatMessage({ id: "meeting.chat.send" })}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

MeetingMessageInput.displayName = "MeetingMessageInput";
