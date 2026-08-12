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
  FileText,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { getPresignedUrls, uploadToS3 } from "../../api/media.api";
import { toast } from "react-toastify";
import MentionDropdown from "./mention-dropdown";
import EmojiPickerPopover from "./emoji-picker-popover";

import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useSpeechToText } from "../../hooks/useSpeechToText";
import { useTextFormatting } from "../../hooks/useTextFormatting";
import { useActiveChat } from "../../hooks/useChatQueries";

interface ThreadChatInputProps {
  onSendMessage?: (content: string, media?: any[], mentions?: string[]) => void;
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

export interface ThreadChatInputRef {
  focus: () => void;
  setMessage: (content: string) => void;
}

const ThreadChatInput = React.memo(
  forwardRef<ThreadChatInputRef, ThreadChatInputProps>(function ThreadChatInput(
    { onSendMessage },
    ref,
  ) {
    const [message, setMessage] = useState("");
    const [showThreadOptions, setShowThreadOptions] = useState(false);
    const [showFormatting, setShowFormatting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>([]);

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
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const threadOptionsRef = useRef<HTMLDivElement>(null);

    const activeConversationId = activeConversation?.id;
    const isUploading = uploadingMedia.some((m) => m.status === "uploading");

    // Close options on outside click
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          threadOptionsRef.current &&
          !threadOptionsRef.current.contains(event.target as Node)
        ) {
          setShowThreadOptions(false);
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

    const { isDictating, interimMessage, toggleDictation, clearInterim } =
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

    // Auto resize height according to content
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.style.height = "auto";
      const borderHeight = textarea.offsetHeight - textarea.clientHeight;
      const newHeight = Math.min(textarea.scrollHeight + borderHeight, 180); // Max 180px inside thread
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

    const handleTyping = useCallback((text: string, cursorPosition: number) => {
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
    }, []);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
      setMessage: (content: string) => {
        setMessage(content);
      },
    }));

    useEffect(() => {
      if (activeConversationId && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [activeConversationId]);

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
      setShowThreadOptions(false);

      try {
        if (!activeConversationId) throw new Error("No active conversation");

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
      if (!message.trim() && uploadingMedia.length === 0) return;
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
    }, [
      message,
      interimMessage,
      uploadingMedia,
      isUploading,
      onSendMessage,
      clearInterim,
    ]);

    return (
      <div className="w-full bg-white border-t border-gray-200 flex justify-center">
        <div className="w-full p-2">
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
                  <ImageIcon
                    size={16}
                    className="text-blue-500 flex-shrink-0"
                  />
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

          <div className="flex bg-gray-50 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all relative rounded-xl p-1.5 gap-1.5 items-center">
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

            {/* Actions Trigger Dropdown */}
            <div ref={threadOptionsRef} className="relative flex-shrink-0">
              <button
                ref={plusButtonRef}
                type="button"
                onClick={() => setShowThreadOptions(!showThreadOptions)}
                disabled={isUploading}
                className={`cursor-pointer p-1.5 rounded-full transition-colors ${
                  showThreadOptions
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-400 hover:bg-gray-200"
                }`}
                title="Options"
              >
                <Plus
                  size={18}
                  className={`transition-transform ${showThreadOptions ? "rotate-45" : ""}`}
                />
              </button>

              {showThreadOptions && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-200 z-50">
                  <button
                    onClick={() => {
                      setShowThreadOptions(false);
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left disabled:opacity-50"
                  >
                    <Paperclip size={14} className="text-gray-500" /> Document
                  </button>
                  <button
                    onClick={() => {
                      setShowThreadOptions(false);
                      setShowFormatting(!showFormatting);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <Type size={14} className="text-blue-500" /> Formatting
                  </button>
                  <button
                    onClick={() => {
                      setShowThreadOptions(false);
                      setShowEmojiPicker(true);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <Smile size={14} className="text-yellow-500" /> Emoji
                  </button>
                  <button
                    onClick={() => {
                      setShowThreadOptions(false);
                      toggleDictation();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <Mic size={14} className="text-green-500" /> Voice Input
                  </button>
                  <button
                    onClick={() => {
                      setShowThreadOptions(false);
                      startRecording();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    <Voicemail size={14} className="text-red-500" /> Voice Message
                  </button>
                </div>
              )}
            </div>

            {/* Emoji Picker Popover */}
            <EmojiPickerPopover
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              triggerRef={plusButtonRef}
              onEmojiSelect={handleEmojiSelect}
            />

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
                <div className="flex items-center gap-0.5 pb-1 mb-1 border-b border-gray-200/60 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => applyFormatting("bold")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Bold"
                  >
                    <Bold size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("italic")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Italic"
                  >
                    <Italic size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("strikethrough")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Strikethrough"
                  >
                    <Strikethrough size={13} />
                  </button>
                  <div className="w-px bg-gray-200 mx-1 h-3"></div>
                  <button
                    type="button"
                    onClick={() => applyFormatting("heading")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Heading"
                  >
                    <Heading size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("link")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Link"
                  >
                    <Link size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("code")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Code block"
                  >
                    <Code size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("quote")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Quote"
                  >
                    <Quote size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("bullet")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Bulleted list"
                  >
                    <List size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("number")}
                    className="hover:bg-gray-200 rounded text-gray-500 hover:text-gray-800 transition cursor-pointer p-0.5"
                    title="Numbered list"
                  >
                    <ListOrdered size={13} />
                  </button>
                </div>
              )}

              {/* Textarea Input */}
              <textarea
                id="thread-chat-input-textarea"
                ref={textareaRef}
                value={
                  message +
                  (interimMessage ? (message ? " " : "") + interimMessage : "")
                }
                onChange={(e) => {
                  if (interimMessage) {
                    setMessage(e.target.value);
                    clearInterim();
                  } else {
                    handleTyping(e.target.value, e.target.selectionStart);
                  }
                }}
                placeholder="Reply in thread..."
                disabled={isUploading}
                className="w-full bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50 overflow-y-auto px-1 py-1 text-xs min-h-[24px]"
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

            {/* Action Buttons / Recording UI */}
            <div className="flex items-center gap-1.5 flex-shrink-0 relative">
              {isRecording ? (
                <div className="flex items-center gap-2.5 px-1 animate-in fade-in">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-red-500 font-medium text-xs">
                    {formatTime(recordingTime)}
                  </span>
                  <button
                    onClick={cancelRecording}
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 rounded-full transition cursor-pointer"
                    title="Cancel recording"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={stopRecording}
                    className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition cursor-pointer"
                    title="Send"
                  >
                    <Send size={14} />
                  </button>
                </div>
              ) : (
                <button
                  className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                    (message.trim() ||
                      uploadingMedia.some((m) => m.status === "success")) &&
                    !isUploading
                      ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                      : "bg-gray-200 text-gray-400"
                  }`}
                  disabled={
                    (!message.trim() && uploadingMedia.length === 0) ||
                    isUploading
                  }
                  onClick={handleSend}
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }),
);

export default ThreadChatInput;
export type { ThreadChatInputProps };
