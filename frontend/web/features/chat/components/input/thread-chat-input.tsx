"use client";
import { useId as useControlledPopupId } from "react";

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
  UploadCloud,
  Folder,
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { useChatMemberProfiles } from "../../hooks/useChatMemberProfiles";
import { useChannelMembersSearch } from "../../hooks/useChannelMembersSearch";
import { getPresignedUrls, uploadToS3 } from "../../api/media.api";
import { toast } from "sonner";
import MentionDropdown from "./mention-dropdown";
import EmojiPickerPopover from "./emoji-picker-popover";
import MyFilesSelectModal from "../modals/shared/my-files-select-modal";

import { useAudioRecorder } from "../../hooks/input/useAudioRecorder";
import { useSpeechToText } from "../../hooks/input/useSpeechToText";
import { useTextFormatting } from "../../hooks/input/useTextFormatting";
import { useActiveChat } from "../../hooks/useChatQueries";
import {
  claimVoiceSession,
  releaseVoiceSession,
} from "../../utils/voice-session-coordinator";
import { ChatContextType } from "../../types/chat.types";
import {
  getCachedMentionOptions,
  getChannelMentionOptions,
} from "../../utils/mention-member-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";


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
  const controlledPopupId = useControlledPopupId();
    const [message, setMessage] = useState("");
    const [showThreadOptions, setShowThreadOptions] = useState(false);
    const [showFormatting, setShowFormatting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isMyFilesModalOpen, setIsMyFilesModalOpen] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>([]);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const dragCounter = useRef(0);

    const { activeChat: activeConversation, activeChatType } = useActiveChat();
    const memberProfiles = useChatMemberProfiles();
    const authUserId = useAppSelector((state: any) => state.auth.userId);

    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentions, setMentions] = useState<string[]>([]);

    const mentionListId = React.useId();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const plusButtonRef = useRef<HTMLButtonElement>(null);
    const threadOptionsRef = useRef<HTMLDivElement>(null);
    const voiceSessionIdRef = useRef(
      `thread-input-${Math.random().toString(36).slice(2)}`,
    );

    const activeConversationId = activeConversation?.id;
    const isUploading = uploadingMedia.some((m) => m.status === "uploading");
    const { membersResponse } = useChannelMembersSearch({
      channelId: activeConversationId,
      searchQuery: mentionQuery ?? "",
      enabled:
        mentionQuery !== null &&
        activeChatType === ChatContextType.CHANNEL,
    });

    // Close options on outside click


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
    } = useSpeechToText({ onTranscript: appendTranscript });

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

    const handleStopDictation = useCallback(() => {
      stopDictation();
      releaseVoiceSession(dictationSessionId);
    }, [dictationSessionId, stopDictation]);

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
      const newHeight = Math.min(textarea.scrollHeight + borderHeight, 180); // Max 180px inside thread
      textarea.style.height = `${newHeight}px`;
    }, [message, interimMessage]);

    const filteredMembers = React.useMemo(() => {
      if (mentionQuery === null) return [];

      if (activeChatType === ChatContextType.CHANNEL) {
        return getChannelMentionOptions(membersResponse, authUserId);
      }

      return getCachedMentionOptions(
        activeConversation?.members,
        memberProfiles,
        mentionQuery,
        authUserId,
      );
    }, [
      activeChatType,
      activeConversation?.members,
      authUserId,
      memberProfiles,
      membersResponse,
      mentionQuery,
    ]);

    useEffect(() => {
      if (selectedIndex >= filteredMembers.length) {
        setSelectedIndex(0);
      }
    }, [filteredMembers.length, selectedIndex]);

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
        toast.error("File size limit exceeded (max 100MB).");
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
        if (!activeConversationId) {
          throw new Error(
            activeChatType === ChatContextType.CHANNEL
              ? "No active channel"
              : "No active direct message",
          );
        }

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
        toast.warning("Please wait for files to finish uploading.");
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
        <div className="w-full p-2">
          {/* File Previews */}
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
                      {formatFileSize(media.sizeBytes)}
                    </span>
                  </div>

                  {media.status === "uploading" && (
                    <Loader2
                      size={14}
                      className="text-info-content animate-spin ml-1 flex-shrink-0"
                    />
                  )}

                  <Button variant="unstyled"
                    type="button"
                    onClick={() => removeFile(media.id)}
                    className="text-muted-foreground hover:text-destructive-content transition ml-1 flex-shrink-0 cursor-pointer"
                    title={
                      media.status === "uploading"
                        ? "Remove uploading file"
                        : "Remove file"
                    }
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex bg-background border border-input focus-within:border-info-outline focus-within:ring-1 focus-within:ring-ring transition-all relative rounded-panel p-1.5 gap-1.5 items-center">
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
              <Button aria-expanded={showThreadOptions} aria-controls={`${controlledPopupId}-showThreadOptions`} aria-haspopup="menu" variant="unstyled"
                ref={plusButtonRef}
                type="button"
                onClick={() => setShowThreadOptions(!showThreadOptions)}
                disabled={isUploading}
                className={`cursor-pointer p-1.5 rounded-full transition-colors ${
                  showThreadOptions
                    ? "bg-info-soft text-info-content"
                    : "text-muted-foreground hover:bg-accent"
                }`}
                title="Options"
              >
                <Plus
                  size={18}
                  className={`transition-transform ${showThreadOptions ? "rotate-45" : ""}`}
                />
              </Button>

              {showThreadOptions && (
                <AnchoredMenu id={`${controlledPopupId}-showThreadOptions`} onClose={() => setShowThreadOptions(false)} side="top" align="start" aria-label="Thread attachments" className="bg-card border border-border rounded-panel p-2 flex flex-col gap-1 min-w-[170px] animate-in fade-in zoom-in-95 duration-200 z-50 shadow-panel">
                  <DropdownMenuItem closeOnClick={false}
                    onClick={() => {
                      setShowThreadOptions(false);
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left disabled:opacity-50"
                  >
                    <Paperclip size={14} className="text-muted-foreground" />
                    Files
                  </DropdownMenuItem>
                  <DropdownMenuItem closeOnClick={false}
                    onClick={() => {
                      setShowThreadOptions(false);
                      setIsMyFilesModalOpen(true);
                    }}
                    disabled={isUploading}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left disabled:opacity-50"
                  >
                    <Folder size={14} className="text-info-content" />
                    My Files
                  </DropdownMenuItem>
                  <DropdownMenuItem closeOnClick={false}
                    onClick={() => {
                      setShowThreadOptions(false);
                      setShowFormatting(!showFormatting);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left"
                  >
                    <Type size={14} className="text-info-content" />
                    Formatting
                  </DropdownMenuItem>
                  <DropdownMenuItem closeOnClick={false}
                    onClick={() => {
                      setShowThreadOptions(false);
                      setShowEmojiPicker(true);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left"
                  >
                    <Smile size={14} className="text-warning-content" />
                    Emoji
                  </DropdownMenuItem>
                  <DropdownMenuItem closeOnClick={false}
                    onClick={() => {
                      setShowThreadOptions(false);
                      handleStartDictation();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left"
                  >
                    <Mic size={14} className="text-success-content" />
                    Voice input
                  </DropdownMenuItem>
                  <DropdownMenuItem closeOnClick={false}
                    onClick={() => {
                      setShowThreadOptions(false);
                      void handleStartRecording();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-control transition-colors cursor-pointer text-left"
                  >
                    <Voicemail size={14} className="text-destructive-content" />
                    Voice message
                  </DropdownMenuItem>
                </AnchoredMenu>
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
            <MentionDropdown id={mentionListId}
              query={mentionQuery}
              members={filteredMembers}
              selectedIndex={selectedIndex}
              onSelect={insertMention}
            />

            {/* Textarea Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Formatting Toolbar */}
              {showFormatting && (
                <div className="flex items-center gap-0.5 pb-1 mb-1 border-b border-border/60 overflow-x-auto">
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("bold")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Bold"
                  >
                    <Bold size={13} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("italic")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Italic"
                  >
                    <Italic size={13} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("strikethrough")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Strikethrough"
                  >
                    <Strikethrough size={13} />
                  </Button>
                  <div className="w-px bg-accent mx-1 h-3"></div>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("heading")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Heading"
                  >
                    <Heading size={13} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("link")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Link"
                  >
                    <Link size={13} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("code")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Code Block"
                  >
                    <Code size={13} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("quote")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Quote"
                  >
                    <Quote size={13} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("bullet")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Bulleted List"
                  >
                    <List size={13} />
                  </Button>
                  <Button variant="unstyled"
                    type="button"
                    onClick={() => applyFormatting("number")}
                    className="hover:bg-accent rounded text-muted-foreground hover:text-foreground transition cursor-pointer p-0.5"
                    title="Numbered List"
                  >
                    <ListOrdered size={13} />
                  </Button>
                </div>
              )}

              {/* Textarea Input */}
              <Textarea unstyled role="combobox" aria-label="Reply in thread" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={mentionQuery !== null && filteredMembers.length > 0} aria-controls={mentionQuery !== null && filteredMembers.length > 0 ? mentionListId : undefined} aria-activedescendant={mentionQuery !== null && filteredMembers.length > 0 ? `${mentionListId}-option-${selectedIndex}` : undefined}
                id="thread-chat-input-textarea"
                ref={textareaRef}
                onPaste={handlePaste}
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
                className="w-full bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50 overflow-y-auto px-1 py-1 text-xs min-h-[24px]"
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
                  <div className="w-2 h-2 rounded-full bg-destructive-content animate-pulse"></div>
                  <span className="text-destructive-content font-medium text-xs">
                    {formatTime(recordingTime)}
                  </span>
                  <Button variant="unstyled"
                    onClick={handleCancelRecording}
                    className="p-1.5 text-muted-foreground hover:text-destructive-content hover:bg-accent rounded-full transition cursor-pointer"
                    title="Cancel recording"
                  >
                    <Trash2 size={16} />
                  </Button>
                  <Button variant="unstyled"
                    onClick={handleStopRecording}
                    className="p-1.5 text-primary-foreground bg-primary hover:bg-primary rounded-full transition cursor-pointer"
                    title="Send"
                  >
                    <Send size={14} />
                  </Button>
                </div>
              ) : (
                <>
                  {isDictating && (
                    <Button variant="unstyled"
                      type="button"
                      onClick={handleStopDictation}
                      className="p-1.5 rounded-full bg-destructive-soft text-destructive-content animate-pulse hover:bg-destructive-soft transition-colors cursor-pointer"
                      title="Stop speech to text"
                    >
                      <Mic size={15} />
                    </Button>
                  )}
                  <Button variant="unstyled" aria-label="Send message"
                    className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                      (message.trim() ||
                        interimMessage.trim() ||
                        uploadingMedia.some((m) => m.status === "success")) &&
                      !isUploading
                        ? "bg-primary text-primary-foreground hover:bg-primary cursor-pointer"
                        : "bg-accent text-muted-foreground"
                    }`}
                    disabled={
                      (!message.trim() &&
                        !interimMessage.trim() &&
                        uploadingMedia.length === 0) ||
                      isUploading
                    }
                    onClick={handleSend}
                  >
                    <Send size={15} />
                  </Button>
                </>
              )}
            </div>
          </div>
          <MyFilesSelectModal
            isOpen={isMyFilesModalOpen}
            onClose={() => setIsMyFilesModalOpen(false)}
            onSelect={handleSelectMyFiles}
          />
        </div>
      </div>
    );
  }),
);

export default ThreadChatInput;
export type { ThreadChatInputProps };
