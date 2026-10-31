"use client";

import type { SendSocketMessageMedia } from "../../types/chat-socket.types";
import { IconButton } from "@/components/ui/icon-button";
import { FIELD_FOCUS_CONTAINER_CLASS_NAME } from "@/components/ui/field-focus";
import { useId as useControlledPopupId } from "react";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import MessageComposerPreview from "./message-composer-preview";
import PastingMessageFiles from "./pasting-message-files";
import { useCopiedMessagePaste } from "../../hooks/input/useCopiedMessagePaste";
import { CHAT_ATTACHMENT_MAX_SIZE_BYTES, MESSAGE_CLIPBOARD_MESSAGES } from "../../types/message-clipboard.types";
import { composeMessageText } from "../../utils/message-draft";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { FileText, Image as ImageIcon, Mic, Paperclip, Send, Smile, Trash2, Type, Voicemail, X, UploadCloud, Folder } from "lucide-react";
import { toast } from "sonner";
import { getPresignedUrls, uploadToS3 } from "../../api/media.api";
import EmojiPickerPopover from "./emoji-picker-popover";
import MyFilesSelectModal from "../modals/shared/my-files-select-modal";
import { useAudioRecorder } from "../../hooks/input/useAudioRecorder";
import { useSpeechToText } from "../../hooks/input/useSpeechToText";
import { useActiveChat } from "../../hooks/useChatQueries";
import {
  claimVoiceSession,
  releaseVoiceSession,
} from "../../utils/voice-session-coordinator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";


export interface DirectMessageInputProps {
  onSendMessage?: (content: string, media?: SendSocketMessageMedia[]) => void;
  onTypingChange?: (isTyping: boolean) => void;
  placeholder?: string;
  compact?: boolean;
  autoFocusOnConversationChange?: boolean;
}

interface UploadingMedia {
  id: string;
  file: File;
  status: "uploading" | "success" | "error";
  s3Key?: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DirectMessageInputRef {
  focus: () => void;
  setMessage: (content: string) => void;
}


function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const DirectMessageInput = React.memo(
  forwardRef<DirectMessageInputRef, DirectMessageInputProps>(
    function DirectMessageInput(
      {
        onSendMessage,
        onTypingChange,
        placeholder,
        compact = false,
        autoFocusOnConversationChange = true,
      },
      ref,
    ) {
  const controlledPopupId = useControlledPopupId();
      const { activeChatId: activeConversationId, activeChatType } =
        useActiveChat();
      const resolvedPlaceholder = placeholder ?? "Type a message...";
      const memberProfiles = useChatMemberProfiles();
      const [message, setMessage] = useState("");
      const [showPreview, setShowPreview] = useState(false);
      const [showEmojiPicker, setShowEmojiPicker] = useState(false);
      const [showMicOptions, setShowMicOptions] = useState(false);
      const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>(
        [],
      );
      const [isDraggingOver, setIsDraggingOver] = useState(false);
      const dragCounter = useRef(0);
      const [showDMOptions, setShowDMOptions] = useState(false);
      const [isMyFilesModalOpen, setIsMyFilesModalOpen] = useState(false);

      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const emojiButtonRef = useRef<HTMLButtonElement>(null);
      const micOptionsRef = useRef<HTMLDivElement>(null);
      const dmOptionsRef = useRef<HTMLDivElement>(null);
      const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
      const isTypingRef = useRef(false);

      // Close DM options on click outside

      const voiceSessionIdRef = useRef(
        `direct-input-${Math.random().toString(36).slice(2)}`,
      );


      const appendTranscript = useCallback((finalText: string) => {
        setMessage(
          (prev) =>
            prev +
            (prev.endsWith(" ") || prev === "" ? "" : " ") +
            finalText.trim(),
        );
      }, []);

      const {
        isDictating,
        interimMessage,
        startDictation,
        stopDictation,
        clearInterim,
      } = useSpeechToText({ onTranscript: appendTranscript });

      const handleRecordComplete = useCallback(
        (file: File) => {
          void uploadFilesList([file]);
        },
        [activeConversationId],
      );

      const {
        isRecording,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording,
      } = useAudioRecorder({ onRecordComplete: handleRecordComplete });

      const dictationSessionId = `${voiceSessionIdRef.current}:speech-to-text`;
      const recordingSessionId = `${voiceSessionIdRef.current}:voice-message`;

      const handleStartDictation = useCallback(() => {
        cancelRecording();
        releaseVoiceSession(recordingSessionId);
        claimVoiceSession({
          id: dictationSessionId,
          type: "speech-to-text",
          stop: stopDictation,
        });

        if (!startDictation()) {
          releaseVoiceSession(dictationSessionId);
        }
      }, [
        cancelRecording,
        dictationSessionId,
        recordingSessionId,
        startDictation,
        stopDictation,
      ]);

      const handleStartRecording = useCallback(async () => {
        stopDictation();
        releaseVoiceSession(dictationSessionId);
        claimVoiceSession({
          id: recordingSessionId,
          type: "voice-message",
          stop: cancelRecording,
        });

        const started = await startRecording();
        if (!started) {
          releaseVoiceSession(recordingSessionId);
        }
      }, [
        cancelRecording,
        dictationSessionId,
        recordingSessionId,
        startRecording,
        stopDictation,
      ]);

      const handleStopRecording = useCallback(() => {
        stopRecording();
        releaseVoiceSession(recordingSessionId);
      }, [recordingSessionId, stopRecording]);

      const handleCancelRecording = useCallback(() => {
        cancelRecording();
        releaseVoiceSession(recordingSessionId);
      }, [cancelRecording, recordingSessionId]);

      useEffect(() => {
        if (!isDictating) {
          releaseVoiceSession(dictationSessionId);
        }
      }, [dictationSessionId, isDictating]);

      useEffect(() => {
        if (!isRecording) {
          releaseVoiceSession(recordingSessionId);
        }
      }, [isRecording, recordingSessionId]);



      useImperativeHandle(ref, () => ({
        focus: () => textareaRef.current?.focus(),
        setMessage: (content: string) => setMessage(content),
      }));

      useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        const borderHeight = textarea.offsetHeight - textarea.clientHeight;
        const maxHeight = compact ? 160 : 220;
        textarea.style.height = `${Math.min(
          textarea.scrollHeight + borderHeight,
          maxHeight,
        )}px`;
      }, [compact, interimMessage, message]);

      useEffect(() => {
        if (autoFocusOnConversationChange) {
          textareaRef.current?.focus();
        }

        return () => {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          if (isTypingRef.current) {
            onTypingChange?.(false);
          }
        };
      }, [activeConversationId, autoFocusOnConversationChange, onTypingChange]);

      const handleTyping = useCallback(
        (text: string) => {
          setMessage(text);
          if (interimMessage) {
            clearInterim();
          }

          if (!isTypingRef.current && text.trim().length > 0) {
            isTypingRef.current = true;
            onTypingChange?.(true);
          }

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          if (text.trim().length === 0) {
            if (isTypingRef.current) {
              isTypingRef.current = false;
              onTypingChange?.(false);
            }
            return;
          }

          typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            onTypingChange?.(false);
          }, 3000);
        },
        [clearInterim, interimMessage, onTypingChange],
      );

      const handleEmojiSelect = useCallback(
        (emoji: string) => {
          const textarea = textareaRef.current;
          if (!textarea) {
            setMessage((prev) => prev + emoji);
            return;
          }

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const nextMessage =
            message.substring(0, start) + emoji + message.substring(end);
          setMessage(nextMessage);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(
              start + emoji.length,
              start + emoji.length,
            );
          }, 0);
        },
        [message],
      );

      const uploadFilesList = useCallback(
        async (files: File[], signal?: AbortSignal) => {
          if (signal?.aborted) return;
          const validFiles = files.filter(
            (file) => file.size <= CHAT_ATTACHMENT_MAX_SIZE_BYTES,
          );
          if (validFiles.length < files.length) {
            toast.error(MESSAGE_CLIPBOARD_MESSAGES.fileTooLarge);
          }
          if (validFiles.length === 0) return;

          const newUploads: UploadingMedia[] = validFiles.map((file) => ({
            id: `${Date.now()}-${crypto.randomUUID()}`,
            file,
            status: "uploading",
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }));

          setUploadingMedia((prev) => [...prev, ...newUploads]);
          const cancelUploads = () => setUploadingMedia((prev) => prev.filter((media) => !newUploads.some((upload) => upload.id === media.id)));
          signal?.addEventListener("abort", cancelUploads, { once: true });

          try {
            if (!activeConversationId) {
              throw new Error("No active conversation");
            }

            if (!activeChatType) {
              throw new Error("No active chat type");
            }

            const presignedUrls = await getPresignedUrls({
              chatId: activeConversationId,
              chatType: activeChatType,
              files: newUploads.map((upload) => ({
                fileName: upload.name,
                mimeType: upload.mimeType,
                sizeBytes: upload.sizeBytes,
              })),
            });

            if (signal?.aborted) return;
            await Promise.all(newUploads.map(async (upload, index) => {
              const presignedInfo = presignedUrls[index];
              try {
                const success = await uploadToS3(
                  upload.file,
                  presignedInfo.presignedUrl,
                  signal,
                );
                if (signal?.aborted) return;
                setUploadingMedia((prev) =>
                  prev.map((media) =>
                    media.id === upload.id
                      ? {
                          ...media,
                          status: success ? "success" : "error",
                          s3Key: success ? presignedInfo.s3Key : media.s3Key,
                        }
                      : media,
                  ),
                );
              } catch {
                if (signal?.aborted) return;
                setUploadingMedia((prev) =>
                  prev.map((media) =>
                    media.id === upload.id
                      ? { ...media, status: "error" }
                      : media,
                  ),
                );
              }
            }));
          } catch (error) {
            if (signal?.aborted) return;
            console.error("Error initiating direct upload:", error);
            setUploadingMedia((prev) =>
              prev.map((media) =>
                newUploads.some((upload) => upload.id === media.id)
                  ? { ...media, status: "error" }
                  : media,
              ),
            );
          } finally {
            signal?.removeEventListener("abort", cancelUploads);
          }
        },
        [activeChatType, activeConversationId],
      );

      const handleFileChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
          if (!event.target.files) return;
          const files = Array.from(event.target.files);
          event.target.value = "";
          void uploadFilesList(files);
        },
        [uploadFilesList],
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
          const newUploads: UploadingMedia[] = files.map((f) => ({
            id: Math.random().toString(36).substring(7) + Date.now(),
            status: "success",
            name: f.name,
            mimeType: f.mimeType,
            sizeBytes: f.sizeBytes,
            s3Key: f.s3Key,
            file: new File([], f.name, { type: f.mimeType }),
          }));
          setUploadingMedia((prev) => [...prev, ...newUploads]);
        },
        [],
      );

      const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setIsDraggingOver(true);
        }
      }, []);

      const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
          setIsDraggingOver(false);
        }
      }, []);

      const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }, []);

      const handleDrop = useCallback(
        async (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(false);
          dragCounter.current = 0;

          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            await uploadFilesList(files);
            e.dataTransfer.clearData();
          }
        },
        [uploadFilesList],
      );

      const copiedPaste = useCopiedMessagePaste({
        chatId: activeConversationId,
        chatType: activeChatType,
        onInsertText: handleTyping,
        uploadFiles: uploadFilesList,
      });
      const isUploading = uploadingMedia.some((media) => media.status === "uploading") || copiedPaste.isDownloading;
      const hasFailedAttachments = uploadingMedia.some((media) => media.status === "error") || copiedPaste.hasFailedDownloads;

      const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (copiedPaste.handlePaste(e)) return;
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          e.preventDefault();
          const files = Array.from(e.clipboardData.files);
          await uploadFilesList(files);
        }
      };

      const removeFile = useCallback((id: string) => {
        setUploadingMedia((prev) => prev.filter((media) => media.id !== id));
      }, []);

      const handleSend = useCallback(() => {
        if (!message.trim() && uploadingMedia.length === 0) return;
        if (isUploading) {
          toast.warning(MESSAGE_CLIPBOARD_MESSAGES.pending);
          return;
        }
        if (hasFailedAttachments) {
          toast.error(MESSAGE_CLIPBOARD_MESSAGES.failedFiles);
          return;
        }
        if (!onSendMessage) return;

        const mediaList = uploadingMedia
          .filter((media) => media.status === "success")
          .map((media) => ({
            name: media.name,
            s3Key: media.s3Key!,
            mimeType: media.mimeType,
            sizeBytes: media.sizeBytes,
          }));

        const finalMessage =
          composeMessageText(message, interimMessage);

        onSendMessage(
          finalMessage.trim(),
          mediaList.length ? mediaList : undefined,
        );
        setMessage("");
        clearInterim();
        setShowPreview(false);
        setUploadingMedia([]);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (isTypingRef.current) {
          isTypingRef.current = false;
          onTypingChange?.(false);
        }
      }, [
        clearInterim,
        interimMessage,
        isUploading,
        hasFailedAttachments,
        message,
        onSendMessage,
        onTypingChange,
        uploadingMedia,
      ]);

      const formatRecordingTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
      };

      const canSend =
        (message.trim() ||
          interimMessage.trim() ||
          uploadingMedia.some((media) => media.status === "success")) &&
        !isUploading && !hasFailedAttachments;

      return (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="min-w-0 w-full shrink-0 bg-card border-t border-border flex justify-center relative"
        >
          {isDraggingOver && (
            <div className="absolute inset-0 bg-info-soft/80 border-2 border-dashed border-info-outline rounded-panel m-4 flex flex-col items-center justify-center z-50 pointer-events-none animate-in fade-in duration-200">
              <UploadCloud
                className="text-info-content mb-2"
                size={28}
              />
              <p className="text-xs font-semibold text-info-content">
                Drop files here
              </p>
            </div>
          )}
          <div className={compact ? "w-full p-2" : "w-full p-4 [@media(max-height:30rem)]:p-2"}>
            <PastingMessageFiles files={copiedPaste.files} onRemove={copiedPaste.removeFile} />
            {uploadingMedia.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {uploadingMedia.map((media) => (
                  <div
                    key={media.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-[220px] ${
                      media.status === "error"
                        ? "bg-destructive-soft border border-border"
                        : "bg-muted"
                    }`}
                  >
                    {media.mimeType.startsWith("image/") ? (
                      <ImageIcon
                        size={16}
                        className="text-info-content flex-shrink-0"
                      />
                    ) : (
                      <FileText
                        size={16}
                        className="text-muted-foreground flex-shrink-0"
                      />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs truncate text-foreground">
                        {media.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {media.status === "error" ? MESSAGE_CLIPBOARD_MESSAGES.uploadFailed : formatFileSize(media.sizeBytes)}
                      </span>
                    </div>
                    {media.status === "uploading" && (
                      <Spinner size={14} className="ml-1 flex-shrink-0" />
                    )}
                    <IconButton label="Remove file" showTooltip={false} size="icon-sm"
                      type="button"
                      onClick={() => removeFile(media.id)}
                      className="text-muted-foreground hover:text-destructive-content transition ml-1 flex-shrink-0 cursor-pointer"
                      title="Remove file"
                    >
                      <X size={14} />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            <div
              className={`${FIELD_FOCUS_CONTAINER_CLASS_NAME} @container/composer flex flex-wrap bg-background border border-input transition-all relative items-center ${
                compact ? "rounded-panel p-1.5 gap-1.5" : "rounded-panel p-2 gap-2"
              }`}
            >
              <input
                type="file"
                multiple
                hidden
                accept="*/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
              />

              {/* Actions Trigger Dropdown */}
              <div ref={dmOptionsRef} className="relative flex-shrink-0">
                <Button aria-expanded={showDMOptions} aria-controls={`${controlledPopupId}-showDMOptions`} aria-haspopup="menu" variant="unstyled"
                  type="button"
                  onClick={() => setShowDMOptions(!showDMOptions)}
                  disabled={isUploading}
                  className={`cursor-pointer rounded-full transition-colors text-muted-foreground hover:bg-accent disabled:opacity-50 ${
                    compact ? "p-1.5" : "p-2"
                  }`}
                  title="Attach options"
                >
                  <Paperclip size={compact ? 18 : 20} />
                </Button>

                {showDMOptions && (
                  <AnchoredMenu id={`${controlledPopupId}-showDMOptions`} onClose={() => setShowDMOptions(false)} side="top" align="start" aria-label="Message attachments" className="bg-card border border-border rounded-panel p-2 flex flex-col gap-1 min-w-[165px] animate-in fade-in zoom-in-95 duration-200 z-50 shadow-panel">
                    <DropdownMenuItem closeOnClick={false}
                      onClick={() => {
                        setShowDMOptions(false);
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left disabled:opacity-50"
                    >
                      <Paperclip size={16} className="text-muted-foreground" />
                      Files
                    </DropdownMenuItem>
                    <DropdownMenuItem closeOnClick={false}
                      onClick={() => {
                        setShowDMOptions(false);
                        setIsMyFilesModalOpen(true);
                      }}
                      disabled={isUploading}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left disabled:opacity-50"
                    >
                      <Folder size={16} className="text-info-content" />
                      My Files
                    </DropdownMenuItem>
                  </AnchoredMenu>
                )}
              </div>

              <MessageComposerPreview message={message} interimMessage={interimMessage} memberProfiles={memberProfiles} compact={compact} open={showPreview} onOpenChange={setShowPreview} className="flex-1 @max-[480px]/composer:order-first @max-[480px]/composer:basis-full">
              <Textarea unstyled focusMode="container" aria-label="Direct message"
                ref={textareaRef}
                value={
                  message +
                  (interimMessage
                    ? `${message ? " " : ""}${interimMessage}`
                    : "")
                }
                onChange={(event) => handleTyping(event.target.value)}
                onPaste={handlePaste}
                placeholder={resolvedPlaceholder}
                disabled={isUploading}
                className={`flex-1 min-w-0 max-h-[min(15rem,30dvh)] bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50 overflow-y-auto [@media(max-height:30rem)]:max-h-12 ${
                  compact
                    ? "px-1 py-1 text-xs min-h-[24px]"
                    : "px-2 py-2 text-sm min-h-[36px]"
                }`}
                rows={1}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
              </MessageComposerPreview>

              {isRecording ? (
                <div className="flex items-center gap-2.5 px-1 animate-in fade-in">
                  <div className="w-2 h-2 rounded-full bg-destructive-content animate-pulse" />
                  <span className="text-destructive-content font-medium text-xs">
                    {formatRecordingTime(recordingTime)}
                  </span>
                  <Button variant="unstyled"
                    type="button"
                    onClick={handleCancelRecording}
                    className="p-1.5 text-muted-foreground hover:text-destructive-content hover:bg-accent rounded-full transition cursor-pointer"
                    title="Cancel recording"
                  >
                    <Trash2 size={compact ? 14 : 16} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={handleStopRecording}
                    className="p-1.5 text-primary-foreground bg-primary hover:bg-primary rounded-full transition cursor-pointer"
                    title="Send voice message"
                  >
                    <Send size={compact ? 14 : 16} />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative flex-shrink-0">
                    <Button variant="unstyled"
                      ref={emojiButtonRef}
                      type="button"
                      onClick={() => setShowEmojiPicker((value) => !value)}
                      disabled={isUploading}
                      className={`cursor-pointer rounded-full transition-colors disabled:opacity-50 ${
                        showEmojiPicker
                          ? "bg-info-soft text-info-content"
                          : "text-muted-foreground hover:text-muted-foreground hover:bg-accent"
                      } ${compact ? "p-1.5" : "p-2"}`}
                      title="Insert emoji"
                    >
                      <Smile size={compact ? 18 : 20} />
                    </Button>
                    <EmojiPickerPopover
                      isOpen={showEmojiPicker}
                      onClose={() => setShowEmojiPicker(false)}
                      triggerRef={emojiButtonRef}
                      onEmojiSelect={handleEmojiSelect}
                    />
                  </div>

                  <div ref={micOptionsRef} className="relative flex-shrink-0">
                    <Button aria-expanded={showMicOptions} aria-controls={`${controlledPopupId}-showMicOptions`} aria-haspopup="menu" variant="unstyled"
                      type="button"
                      onClick={() => {
                        if (isDictating) {
                          stopDictation();
                        } else {
                          setShowMicOptions((value) => !value);
                        }
                      }}
                      disabled={isUploading}
                      className={`cursor-pointer rounded-full transition-colors disabled:opacity-50 ${
                        isDictating
                          ? "bg-destructive-soft text-destructive-content animate-pulse"
                          : showMicOptions
                            ? "bg-info-soft text-info-content"
                            : "text-muted-foreground hover:text-muted-foreground hover:bg-accent"
                      } ${compact ? "p-1.5" : "p-2"}`}
                      title="Voice options"
                    >
                      <Mic size={compact ? 18 : 20} />
                    </Button>

                    {showMicOptions && !isDictating && (
                      <AnchoredMenu id={`${controlledPopupId}-showMicOptions`} onClose={() => setShowMicOptions(false)} side="top" align="end" aria-label="Microphone options" className="bg-card border border-border rounded-panel p-2 flex flex-col gap-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-200 z-50 shadow-panel">
                        <DropdownMenuItem closeOnClick={false}

                          onClick={() => {
                            setShowMicOptions(false);
                            void handleStartRecording();
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-control transition text-left cursor-pointer"
                        >
                          <Voicemail size={16} className="text-info-content" />
                          Send voice message
                        </DropdownMenuItem>
                        <DropdownMenuItem closeOnClick={false}

                          onClick={() => {
                            setShowMicOptions(false);
                            handleStartDictation();
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-control transition text-left cursor-pointer"
                        >
                          <Type size={16} className="text-success-content" />
                          Speech to text
                        </DropdownMenuItem>
                      </AnchoredMenu>
                    )}
                  </div>

                  <Button variant="unstyled"
                    type="button"
                    className={`rounded-full transition-colors flex items-center justify-center ${
                      compact ? "p-1.5" : "p-2"
                    } ${
                      canSend
                        ? "bg-primary text-primary-foreground hover:bg-primary cursor-pointer"
                        : "bg-accent text-muted-foreground"
                    }`}
                    disabled={!canSend}
                    onClick={handleSend}
                    title="Send"
                  >
                    <Send size={compact ? 15 : 18} />
                  </Button>
                </>
              )}
            </div>
          </div>
          {activeConversationId && activeChatType && <MyFilesSelectModal
            context={{ chatId: activeConversationId, chatType: activeChatType }}
            isOpen={isMyFilesModalOpen}
            onClose={() => setIsMyFilesModalOpen(false)}
            onSelect={handleSelectMyFiles}
          />}
        </div>
      );
    },
  ),
);

export default DirectMessageInput;
