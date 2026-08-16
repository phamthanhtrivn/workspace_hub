"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Smile,
  Trash2,
  Type,
  Voicemail,
  X,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { getPresignedUrls, uploadToS3 } from "../../api/media.api";
import EmojiPickerPopover from "./emoji-picker-popover";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { useActiveChat } from "../../hooks/useChatQueries";
import {
  claimVoiceSession,
  releaseVoiceSession,
} from "../../utils/voice-session-coordinator";

export interface DirectMessageInputProps {
  onSendMessage?: (content: string, media?: any[]) => void;
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

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

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
        placeholder = "Message...",
        compact = false,
        autoFocusOnConversationChange = true,
      },
      ref,
    ) {
      const {
        activeChatId: activeConversationId,
        activeChatType,
      } = useActiveChat();
      const [message, setMessage] = useState("");
      const [showEmojiPicker, setShowEmojiPicker] = useState(false);
      const [showMicOptions, setShowMicOptions] = useState(false);
      const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>(
        [],
      );
      const [isDraggingOver, setIsDraggingOver] = useState(false);
      const dragCounter = useRef(0);

      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const emojiButtonRef = useRef<HTMLButtonElement>(null);
      const micOptionsRef = useRef<HTMLDivElement>(null);
      const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
      const isTypingRef = useRef(false);
      const voiceSessionIdRef = useRef(
        `direct-input-${Math.random().toString(36).slice(2)}`,
      );

      const isUploading = uploadingMedia.some(
        (media) => media.status === "uploading",
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
      } =
        useSpeechToText({ onTranscript: appendTranscript });

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

      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (
            micOptionsRef.current &&
            !micOptionsRef.current.contains(event.target as Node)
          ) {
            setShowMicOptions(false);
          }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }, []);

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
        async (files: File[]) => {
          const validFiles = files.filter(
            (file) => file.size <= MAX_FILE_SIZE_BYTES,
          );
          if (validFiles.length < files.length) {
            toast.error("File size cannot exceed 100MB.");
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

            newUploads.forEach(async (upload, index) => {
              const presignedInfo = presignedUrls[index];
              try {
                const success = await uploadToS3(
                  upload.file,
                  presignedInfo.presignedUrl,
                );
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
                setUploadingMedia((prev) =>
                  prev.map((media) =>
                    media.id === upload.id
                      ? { ...media, status: "error" }
                      : media,
                  ),
                );
              }
            });
          } catch (error) {
            console.error("Error initiating direct upload:", error);
            setUploadingMedia((prev) =>
              prev.map((media) =>
                newUploads.some((upload) => upload.id === media.id)
                  ? { ...media, status: "error" }
                  : media,
              ),
            );
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

      const handlePaste = useCallback(
        async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
          if (e.clipboardData.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            const files = Array.from(e.clipboardData.files);
            await uploadFilesList(files);
          }
        },
        [uploadFilesList],
      );

      const removeFile = useCallback((id: string) => {
        setUploadingMedia((prev) => prev.filter((media) => media.id !== id));
      }, []);

      const handleSend = useCallback(() => {
        if (!message.trim() && uploadingMedia.length === 0) return;
        if (isUploading) {
          toast.warning("Please wait for the file to upload.");
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
          message.trim() + (interimMessage ? ` ${interimMessage.trim()}` : "");

        onSendMessage(finalMessage.trim(), mediaList.length ? mediaList : undefined);
        setMessage("");
        clearInterim();
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
        !isUploading;

      return (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="w-full bg-white border-t border-gray-200 flex justify-center relative"
        >
          {isDraggingOver && (
            <div className="absolute inset-0 bg-blue-50/80 backdrop-blur-xs border-2 border-dashed border-blue-500 rounded-2xl m-4 flex flex-col items-center justify-center z-50 pointer-events-none animate-in fade-in duration-200">
              <UploadCloud
                className="text-blue-500 animate-bounce mb-2"
                size={28}
              />
              <p className="text-xs font-black text-blue-600">
                Drop files here to upload
              </p>
            </div>
          )}
          <div className={compact ? "w-full p-2" : "w-full p-4"}>
            {uploadingMedia.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-2">
                {uploadingMedia.map((media) => (
                  <div
                    key={media.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-[220px] ${
                      media.status === "error"
                        ? "bg-red-50 border border-red-200"
                        : "bg-gray-100"
                    }`}
                  >
                    {media.mimeType.startsWith("image/") ? (
                      <ImageIcon
                        size={16}
                        className="text-blue-500 flex-shrink-0"
                      />
                    ) : (
                      <FileText
                        size={16}
                        className="text-gray-500 flex-shrink-0"
                      />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-xs truncate text-gray-700">
                        {media.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatFileSize(media.sizeBytes)}
                      </span>
                    </div>
                    {media.status === "uploading" && (
                      <Loader2
                        size={14}
                        className="text-blue-500 animate-spin ml-1 flex-shrink-0"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(media.id)}
                      className="text-gray-500 hover:text-red-500 transition ml-1 flex-shrink-0 cursor-pointer"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className={`flex bg-gray-50 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all relative items-center ${
                compact ? "rounded-xl p-1.5 gap-1.5" : "rounded-2xl p-2 gap-2"
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

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`cursor-pointer rounded-full transition-colors text-gray-500 hover:bg-gray-200 disabled:opacity-50 ${
                  compact ? "p-1.5" : "p-2"
                }`}
                title="Attach files"
              >
                <Paperclip size={compact ? 18 : 20} />
              </button>

              <textarea
                ref={textareaRef}
                value={
                  message +
                  (interimMessage
                    ? `${message ? " " : ""}${interimMessage}`
                    : "")
                }
                onChange={(event) => handleTyping(event.target.value)}
                onPaste={handlePaste}
                placeholder={placeholder}
                disabled={isUploading}
                className={`flex-1 min-w-0 bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50 overflow-y-auto ${
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

              {isRecording ? (
                <div className="flex items-center gap-2.5 px-1 animate-in fade-in">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-500 font-medium text-xs">
                    {formatRecordingTime(recordingTime)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelRecording}
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 rounded-full transition cursor-pointer"
                    title="Cancel recording"
                  >
                    <Trash2 size={compact ? 14 : 16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition cursor-pointer"
                    title="Send voice message"
                  >
                    <Send size={compact ? 14 : 16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative flex-shrink-0">
                    <button
                      ref={emojiButtonRef}
                      type="button"
                      onClick={() => setShowEmojiPicker((value) => !value)}
                      disabled={isUploading}
                      className={`cursor-pointer rounded-full transition-colors disabled:opacity-50 ${
                        showEmojiPicker
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                      } ${compact ? "p-1.5" : "p-2"}`}
                      title="Insert emoji"
                    >
                      <Smile size={compact ? 18 : 20} />
                    </button>
                    <EmojiPickerPopover
                      isOpen={showEmojiPicker}
                      onClose={() => setShowEmojiPicker(false)}
                      triggerRef={emojiButtonRef}
                      onEmojiSelect={handleEmojiSelect}
                    />
                  </div>

                  <div ref={micOptionsRef} className="relative flex-shrink-0">
                    <button
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
                          ? "bg-red-100 text-red-600 animate-pulse"
                          : showMicOptions
                            ? "bg-blue-100 text-blue-600"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                      } ${compact ? "p-1.5" : "p-2"}`}
                      title="Voice options"
                    >
                      <Mic size={compact ? 18 : 20} />
                    </button>

                    {showMicOptions && !isDictating && (
                      <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-200 z-50">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMicOptions(false);
                            void handleStartRecording();
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
                        >
                          <Voicemail size={16} className="text-blue-500" />
                          Send voice message
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMicOptions(false);
                            handleStartDictation();
                          }}
                          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
                        >
                          <Type size={16} className="text-green-500" />
                          Speech to text
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`rounded-full transition-colors flex items-center justify-center ${
                      compact ? "p-1.5" : "p-2"
                    } ${
                      canSend
                        ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                        : "bg-gray-200 text-gray-400"
                    }`}
                    disabled={!canSend}
                    onClick={handleSend}
                    title="Send"
                  >
                    <Send size={compact ? 15 : 18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    },
  ),
);

export default DirectMessageInput;
