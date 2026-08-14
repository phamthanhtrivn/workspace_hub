"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  CheckSquare,
  BarChart2,
  Calendar,
  FileText,
  Smile,
  Plus,
  X,
  Loader2,
  Mic,
  Trash2,
  Voicemail,
  Type,
  Bold,
  Italic,
  Strikethrough,
  Heading,
  Link,
  Code,
  Quote,
  List,
  ListOrdered,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { getPresignedUrls, uploadToS3 } from "../../api/media.api";
import { toast } from "sonner";
import MentionDropdown from "./mention-dropdown";
import EmojiPickerPopover from "./emoji-picker-popover";

import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { useTextFormatting } from "../../hooks/useTextFormatting";
import { useActiveChat } from "../../hooks/useChatQueries";
import { ChatContextType } from "../../types/chat.types";
import {
  claimVoiceSession,
  releaseVoiceSession,
} from "../../utils/voice-session-coordinator";

interface ChannelChatInputProps {
  onSendMessage?: (content: string, media?: any[], mentions?: string[]) => void;
  onCreatePoll?: () => void;
  onCreateNote?: () => void;
  onTypingChange?: (isTyping: boolean) => void;
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

export interface ChannelChatInputRef {
  focus: () => void;
  setMessage: (content: string) => void;
}

const ChannelChatInput = React.memo(
  forwardRef<ChannelChatInputRef, ChannelChatInputProps>(
    function ChannelChatInput(
      {
        onSendMessage,
        onCreatePoll,
        onCreateNote,
        onTypingChange,
        autoFocusOnConversationChange = true,
      },
      ref,
    ) {
      const [message, setMessage] = useState("");
      const [showOptions, setShowOptions] = useState(false);
      const [showFormatting, setShowFormatting] = useState(true);
      const [showEmojiPicker, setShowEmojiPicker] = useState(false);
      const [showMicOptions, setShowMicOptions] = useState(false);
      const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>(
        [],
      );

      const {
        activeChat: activeConversation,
        activeChatType,
      } = useActiveChat();
      const memberProfiles = useChatMemberProfiles();
      const authUserId = useAppSelector((state: any) => state.auth.userId);

      const [mentionQuery, setMentionQuery] = useState<string | null>(null);
      const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
      const [selectedIndex, setSelectedIndex] = useState(0);
      const [mentions, setMentions] = useState<string[]>([]);

      const textareaRef = useRef<HTMLTextAreaElement>(null);
      const fileInputRef = useRef<HTMLInputElement>(null);
      const emojiButtonRef = useRef<HTMLButtonElement>(null);
      const mainOptionsRef = useRef<HTMLDivElement>(null);
      const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
      const isTypingRef = useRef(false);
      const voiceSessionIdRef = useRef(
        `conversation-input-${Math.random().toString(36).slice(2)}`,
      );

      const activeConversationId = activeConversation?.id;
      const isUploading = uploadingMedia.some((m) => m.status === "uploading");

      // Close options on outside click
      useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (
            mainOptionsRef.current &&
            !mainOptionsRef.current.contains(event.target as Node)
          ) {
            setShowOptions(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, []);

      // 1. Text Formatting Hook
      const { applyFormatting, handleListKeyDown } = useTextFormatting({
        message,
        setMessage,
        textareaRef,
      });

      // 2. Voice-to-Text Hook
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

      // 3. Audio Recording Hook
      const handleRecordComplete = useCallback(
        (file: File) => {
          uploadFilesList([file]);
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

      // Auto resize height according to content
      useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.style.height = "auto";
        const borderHeight = textarea.offsetHeight - textarea.clientHeight;
        const newHeight = Math.min(textarea.scrollHeight + borderHeight, 240); // Max 240px
        textarea.style.height = `${newHeight}px`;
      }, [message, interimMessage]);

      // Handle members filter for mentions
      const filteredMembers = React.useMemo(() => {
        if (
          mentionQuery === null ||
          !activeConversation?.members ||
          !memberProfiles
        )
          return [];
        const query = mentionQuery.toLowerCase();
        const members = activeConversation.members
          .map((m: any) => m.userId)
          .filter((id: string) => id !== authUserId)
          .map((id: string) => ({
            id,
            name: memberProfiles[id]?.fullName || "Someone",
            avatarUrl: memberProfiles[id]?.avatarUrl,
          }))
          .filter((m: any) => m.name.toLowerCase().includes(query));

        if (
          activeChatType === ChatContextType.CHANNEL &&
          ("all".includes(query) ||
            "everyone".includes(query) ||
            query === "")
        ) {
          return [
            {
              id: "all",
              name: "All",
              avatarUrl: undefined,
              isAll: true,
            },
            ...members.slice(0, 3),
          ];
        }

        return members.slice(0, 4);
      }, [mentionQuery, activeConversation, memberProfiles, authUserId]);

      const handleEmojiSelect = useCallback(
        (emoji: string) => {
          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newMessage =
              message.substring(0, start) + emoji + message.substring(end);
            setMessage(newMessage);
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(
                start + emoji.length,
                start + emoji.length,
              );
            }, 0);
          } else {
            setMessage((prev) => prev + emoji);
          }
        },
        [message],
      );

      const insertMention = useCallback(
        (user: any) => {
          if (mentionStartIndex === -1) return;
          const before = message.substring(0, mentionStartIndex);
          const after = message.substring(
            textareaRef.current?.selectionStart || message.length,
          );
          const newText = `${before}@${user.name} ${after}`;
          setMessage(newText);
          setMentionQuery(null);
          setMentionStartIndex(-1);
          if (!mentions.includes(user.id)) {
            setMentions((prev) => [...prev, user.id]);
          }
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              const newPos = before.length + user.name.length + 2;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        },
        [message, mentionStartIndex, mentions],
      );

      const handleTyping = useCallback(
        (text: string, cursorPosition: number) => {
          setMessage(text);

          const textBeforeCursor = text.substring(0, cursorPosition);
          const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/);

          if (match) {
            setMentionQuery(match[1]);
            setMentionStartIndex(textBeforeCursor.lastIndexOf("@"));
            setSelectedIndex(0);
          } else {
            setMentionQuery(null);
            setMentionStartIndex(-1);
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
          } else {
            typingTimeoutRef.current = setTimeout(() => {
              isTypingRef.current = false;
              onTypingChange?.(false);
            }, 3000);
          }
        },
        [onTypingChange],
      );

      useImperativeHandle(ref, () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
        setMessage: (content: string) => {
          setMessage(content);
        },
      }));

      useEffect(() => {
        if (
          autoFocusOnConversationChange &&
          activeConversationId &&
          textareaRef.current
        ) {
          textareaRef.current.focus();
        }

        if (isTypingRef.current) {
          isTypingRef.current = false;
          onTypingChange?.(false);
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }, [activeConversationId, autoFocusOnConversationChange, onTypingChange]);

      const uploadFilesList = async (files: File[]) => {
        const validFiles = files.filter((f) => f.size <= 100 * 1024 * 1024);
        if (validFiles.length < files.length) {
          toast.error("File size cannot exceed 100MB.");
        }
        if (validFiles.length === 0) return;

        const newUploads: UploadingMedia[] = validFiles.map((f) => ({
          id: Math.random().toString(36).substring(7) + Date.now(),
          file: f,
          status: "uploading",
          name: f.name,
          mimeType: f.type,
          sizeBytes: f.size,
        }));

        setUploadingMedia((prev) => [...prev, ...newUploads]);
        setShowOptions(false);

        try {
          if (!activeConversationId) throw new Error("No active channel");

          const presignRequests = newUploads.map((u) => ({
            fileName: u.name,
            mimeType: u.mimeType,
            sizeBytes: u.sizeBytes,
          }));

          if (!activeChatType) throw new Error("No active chat type");

          const presignedUrls = await getPresignedUrls({
            chatId: activeConversationId,
            chatType: activeChatType,
            files: presignRequests,
          });

          newUploads.forEach(async (upload, idx) => {
            const presignedInfo = presignedUrls[idx];
            try {
              const success = await uploadToS3(
                upload.file,
                presignedInfo.presignedUrl,
              );
              if (success) {
                setUploadingMedia((prev) =>
                  prev.map((m) =>
                    m.id === upload.id
                      ? { ...m, status: "success", s3Key: presignedInfo.s3Key }
                      : m,
                  ),
                );
              } else {
                setUploadingMedia((prev) =>
                  prev.map((m) =>
                    m.id === upload.id ? { ...m, status: "error" } : m,
                  ),
                );
              }
            } catch (e) {
              setUploadingMedia((prev) =>
                prev.map((m) =>
                  m.id === upload.id ? { ...m, status: "error" } : m,
                ),
              );
            }
          });
        } catch (error) {
          console.error("Error initiating upload:", error);
          setUploadingMedia((prev) =>
            prev.map((m) =>
              newUploads.some((nu) => nu.id === m.id)
                ? { ...m, status: "error" }
                : m,
            ),
          );
        }
      };

      const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            e.target.value = "";
            uploadFilesList(newFiles);
          }
        },
        [activeConversationId],
      );

      const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
      };

      const removeFile = useCallback((id: string) => {
        setUploadingMedia((prev) => prev.filter((m) => m.id !== id));
      }, []);

      const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
      };

      const handleSend = useCallback(() => {
        if (!message.trim() && !interimMessage.trim() && uploadingMedia.length === 0) return;
        if (isUploading) {
          toast.warning("Please wait for the file to upload.");
          return;
        }
        if (!onSendMessage) return;

        const successfulMedia = uploadingMedia.filter(
          (m) => m.status === "success",
        );

        const mediaList = successfulMedia.map((m) => ({
          name: m.name,
          s3Key: m.s3Key!,
          mimeType: m.mimeType,
          sizeBytes: m.sizeBytes,
        }));

        onSendMessage(
          message.trim() + (interimMessage ? " " + interimMessage.trim() : ""),
          mediaList.length > 0 ? mediaList : undefined,
          mentions.length > 0 ? mentions : undefined,
        );
        setMessage("");
        clearInterim();
        setUploadingMedia([]);
        setMentions([]);
        setMentionQuery(null);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingRef.current) {
          isTypingRef.current = false;
          onTypingChange?.(false);
        }
      }, [
        message,
        interimMessage,
        uploadingMedia,
        isUploading,
        onSendMessage,
        onTypingChange,
        clearInterim,
      ]);

      const currentMember = activeConversation?.members?.find(
        (m: any) => m.userId === authUserId,
      );
      const otherDirectMemberId =
        activeConversation?.members?.find((m) => m.userId !== authUserId)
          ?.userId ?? null;
      const isMember = currentMember?.role === "MEMBER";
      const allowSendMessage =
        isMember && activeConversation?.setting
          ? activeConversation.setting.allowSendMessage
          : true;
      const allowCreatePoll =
        isMember && activeConversation?.setting
          ? activeConversation.setting.allowCreatePoll
          : true;
      const allowCreateNote =
        isMember && activeConversation?.setting
          ? activeConversation.setting.allowCreateNote
          : true;

      if (!allowSendMessage) {
        return (
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex items-center justify-center p-3 bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 text-sm">
              Only administrators can send messages
            </div>
          </div>
        );
      }

      return (
        <div className="w-full bg-white border-t border-gray-200 flex justify-center">
          <div className="w-full p-4">
            {/* File Previews */}
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
                        className={`${
                          media.status === "error"
                            ? "text-red-500"
                            : "text-blue-500"
                        } flex-shrink-0`}
                      />
                    ) : (
                      <FileText
                        size={16}
                        className={`${
                          media.status === "error"
                            ? "text-red-500"
                            : "text-gray-500"
                        } flex-shrink-0`}
                      />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span
                        className={`text-xs truncate ${
                          media.status === "error"
                            ? "text-red-700"
                            : "text-gray-700"
                        }`}
                      >
                        {media.name}
                      </span>
                      <span
                        className={`text-[10px] ${
                          media.status === "error"
                            ? "text-red-400"
                            : "text-gray-400"
                        }`}
                      >
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
                      title={
                        media.status === "uploading"
                          ? "Remove uploading file"
                          : "Remove file"
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex bg-gray-50 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all relative rounded-2xl p-2 gap-2 items-center">
              {/* Hidden Inputs */}
              <input
                type="file"
                multiple
                hidden
                accept="*/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
              />

              {/* Actions Trigger */}
              <div className="relative flex-shrink-0" ref={mainOptionsRef}>
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  disabled={isUploading}
                  className={`cursor-pointer p-2 rounded-full transition-colors ${
                    showOptions
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <Plus
                    size={20}
                    className={`transition-transform ${showOptions ? "rotate-45" : ""}`}
                  />
                </button>

                {showOptions && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[165px] animate-in fade-in zoom-in-95 duration-200 z-50">
                    <button
                      onClick={() => {
                        setShowOptions(false);
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left disabled:opacity-50"
                    >
                      <Paperclip size={16} className="text-gray-500" /> Files
                    </button>

                    <div className="h-px bg-gray-100 my-1"></div>

                    <button
                      disabled={isUploading}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left cursor-pointer disabled:opacity-50"
                    >
                      <CheckSquare size={16} className="text-green-500" /> Task
                    </button>

                    {allowCreatePoll && (
                      <button
                        onClick={() => {
                          setShowOptions(false);
                          onCreatePoll?.();
                        }}
                        disabled={isUploading}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left disabled:opacity-50"
                      >
                        <BarChart2 size={16} className="text-purple-500" /> Poll
                      </button>
                    )}

                    <button
                      disabled={isUploading}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left cursor-pointer disabled:opacity-50"
                    >
                      <Calendar size={16} className="text-orange-500" /> Event
                    </button>

                    {allowCreateNote && (
                      <button
                        onClick={() => {
                          setShowOptions(false);
                          onCreateNote?.();
                        }}
                        disabled={isUploading}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left disabled:opacity-50"
                      >
                        <FileText size={16} className="text-yellow-500" /> Note
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Mention Dropdown */}
              <MentionDropdown
                query={mentionQuery}
                members={filteredMembers}
                selectedIndex={selectedIndex}
                onSelect={insertMention}
              />

              {/* Textarea Area */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Formatting Toolbar */}
                {showFormatting && (
                  <div className="flex items-center gap-0.5 pb-1.5 mb-1 border-b border-gray-200/60 overflow-x-auto scrollbar-none">
                    <button
                      type="button"
                      onClick={() => applyFormatting("bold")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Bold"
                    >
                      <Bold size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("italic")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Italic"
                    >
                      <Italic size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("strikethrough")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Strikethrough"
                    >
                      <Strikethrough size={15} />
                    </button>

                    <div className="w-px bg-gray-200 mx-1 h-4"></div>

                    <button
                      type="button"
                      onClick={() => applyFormatting("heading")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Heading"
                    >
                      <Heading size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("link")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Link"
                    >
                      <Link size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("code")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Code Block"
                    >
                      <Code size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("quote")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Quote"
                    >
                      <Quote size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("bullet")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Bulleted List"
                    >
                      <List size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormatting("number")}
                      className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-1"
                      title="Numbered List"
                    >
                      <ListOrdered size={15} />
                    </button>
                  </div>
                )}

                {/* Textarea Input */}
                <textarea
                  id="chat-input-textarea"
                  ref={textareaRef}
                  value={
                    message +
                    (interimMessage
                      ? (message ? " " : "") + interimMessage
                      : "")
                  }
                  onChange={(e) => {
                    if (interimMessage) {
                      setMessage(e.target.value);
                      clearInterim();
                    } else {
                      handleTyping(e.target.value, e.target.selectionStart);
                    }
                  }}
                  placeholder={
                    activeChatType === ChatContextType.DIRECT_MESSAGE
                      ? `Message ${
                          otherDirectMemberId
                            ? memberProfiles?.[otherDirectMemberId]?.fullName ||
                              "user"
                            : "user"
                        }...`
                      : "Type @ to mention, message " + activeConversation?.name
                  }
                  disabled={isUploading}
                  className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50 overflow-y-auto px-2 py-2 text-sm min-h-[36px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (mentionQuery !== null && filteredMembers.length > 0) {
                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSelectedIndex((prev) =>
                          prev > 0 ? prev - 1 : filteredMembers.length - 1,
                        );
                        return;
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSelectedIndex((prev) =>
                          prev < filteredMembers.length - 1 ? prev + 1 : 0,
                        );
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertMention(filteredMembers[selectedIndex]);
                        return;
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setMentionQuery(null);
                        return;
                      }
                    }

                    const handled = handleListKeyDown(e);
                    if (handled) return;

                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0 relative pb-1">
                {isRecording ? (
                  <div className="flex items-center gap-2.5 px-1 animate-in fade-in">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-red-500 font-medium text-xs">
                      {formatTime(recordingTime)}
                    </span>
                    <button
                      onClick={handleCancelRecording}
                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 rounded-full transition cursor-pointer"
                      title="Cancel recording"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={handleStopRecording}
                      className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition cursor-pointer"
                      title="Send"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Text Formatting Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowFormatting(!showFormatting)}
                      className={`cursor-pointer p-2 rounded-full transition-colors ${
                        showFormatting
                          ? "bg-blue-100 text-blue-600"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Text formatting"
                      disabled={isUploading}
                    >
                      <Type size={20} />
                    </button>

                    {/* Emoji Picker Popover Trigger */}
                    <div className="relative">
                      <button
                        ref={emojiButtonRef}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`cursor-pointer p-2 rounded-full transition-colors ${
                          showEmojiPicker
                            ? "bg-blue-100 text-blue-600"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                        }`}
                        disabled={isUploading}
                        title="Insert emoji"
                      >
                        <Smile size={20} />
                      </button>
                      <EmojiPickerPopover
                        isOpen={showEmojiPicker}
                        onClose={() => setShowEmojiPicker(false)}
                        triggerRef={emojiButtonRef}
                        onEmojiSelect={handleEmojiSelect}
                      />
                    </div>

                    {/* Mic Dictation Trigger */}
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (isDictating) {
                            stopDictation();
                          } else {
                            setShowMicOptions(!showMicOptions);
                          }
                        }}
                        className={`cursor-pointer p-2 rounded-full transition-colors ${
                          isDictating
                            ? "bg-red-100 text-red-600 animate-pulse"
                            : showMicOptions
                              ? "bg-blue-100 text-blue-600"
                              : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                        }`}
                        title="Voice options"
                        disabled={isUploading}
                      >
                        <Mic size={20} />
                      </button>

                      {showMicOptions && !isDictating && (
                        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-200 z-50">
                          <button
                            onClick={() => {
                              setShowMicOptions(false);
                              void handleStartRecording();
                            }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
                          >
                            <Voicemail size={16} className="text-blue-500" />{" "}
                            Send voice message
                          </button>
                          <button
                            onClick={() => {
                              setShowMicOptions(false);
                              handleStartDictation();
                            }}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
                          >
                            <Type size={16} className="text-green-500" /> Speech to text
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Send Message Button */}
                    <button
                      className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                        (message.trim() ||
                          interimMessage.trim() ||
                          uploadingMedia.some((m) => m.status === "success")) &&
                        !isUploading
                          ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                          : "bg-gray-200 text-gray-400"
                      }`}
                      disabled={
                        (!message.trim() &&
                          !interimMessage.trim() &&
                          uploadingMedia.length === 0) ||
                        isUploading
                      }
                      onClick={handleSend}
                    >
                      <Send size={18} className="mr-0.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    },
  ),
);

export default ChannelChatInput;
export type { ChannelChatInputProps };
