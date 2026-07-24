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
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { getPresignedUrls, uploadToS3 } from "../api/media.api";
import { toast } from "react-toastify";
import MentionDropdown from "./mention-dropdown";
import EmojiPickerPopover from "./emoji-picker-popover";

interface ChatInputProps {
  onSendMessage?: (content: string, media?: any[], mentions?: string[]) => void;
  onCreatePoll?: () => void;
  onCreateNote?: () => void;
  onTypingChange?: (isTyping: boolean) => void;
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

export interface ChatInputRef {
  focus: () => void;
  setMessage: (content: string) => void;
}

const ChatInput = React.memo(
  forwardRef<ChatInputRef, ChatInputProps>(function ChatInput(
    { onSendMessage, onCreatePoll, onCreateNote, onTypingChange },
    ref,
  ) {
    const [message, setMessage] = useState("");
    const [showOptions, setShowOptions] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMicOptions, setShowMicOptions] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>([]);
    const [isDictating, setIsDictating] = useState(false);
    const [interimMessage, setInterimMessage] = useState("");
    const recognitionRef = useRef<any>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const isUploading = uploadingMedia.some((m) => m.status === "uploading");

    const activeConversation = useAppSelector(
      (state: any) => state.chat.activeConversation,
    );
    const memberProfiles = useAppSelector(
      (state: any) => state.chat.memberProfiles,
    );
    const authUserId = useAppSelector((state: any) => state.auth.userId);

    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentions, setMentions] = useState<string[]>([]);

    useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (recognitionRef.current && isDictating) {
          recognitionRef.current.stop();
        }
        if (recordingIntervalRef.current)
          clearInterval(recordingIntervalRef.current);
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        }
      };
    }, [isDictating]);

    // Khởi tạo SpeechRecognition
    useEffect(() => {
      if (typeof window !== "undefined") {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "vi-VN";

          recognition.onresult = (event: any) => {
            let finalTranscript = "";
            let currentInterim = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                currentInterim += event.results[i][0].transcript;
              }
            }
            if (finalTranscript) {
              setMessage(
                (prev) =>
                  prev +
                  (prev.endsWith(" ") || prev === "" ? "" : " ") +
                  finalTranscript.trim(),
              );
            }
            setInterimMessage(currentInterim);
          };

          recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsDictating(false);
            setInterimMessage("");
          };

          recognition.onend = () => {
            setIsDictating(false);
            setInterimMessage("");
          };

          recognitionRef.current = recognition;
        }
      }
    }, []);

    const toggleDictation = () => {
      if (isDictating) {
        recognitionRef.current?.stop();
        setIsDictating(false);
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            setIsDictating(true);
          } catch (e) {
            console.error(e);
          }
        } else {
          toast.error(
            "Trình duyệt của bạn không hỗ trợ tính năng đọc chính tả.",
          );
        }
      }
    };
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
          name: memberProfiles[id]?.fullName || "Ai đó",
          avatarUrl: memberProfiles[id]?.avatarUrl,
        }))
        .filter((m: any) => m.name.toLowerCase().includes(query));
      return members.slice(0, 4);
    }, [mentionQuery, activeConversation, memberProfiles, authUserId]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);

    const handleEmojiSelect = useCallback(
      (emoji: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const newMessage =
            message.substring(0, start) + emoji + message.substring(end);
          setMessage(newMessage);
          // We need to wait a tick for the message state to update before setting selection
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

    const activeConversationId = activeConversation?.id;

    useEffect(() => {
      if (activeConversationId && textareaRef.current) {
        textareaRef.current.focus();
      }

      // Clear typing state when active conversation changes
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingChange?.(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }, [activeConversationId, onTypingChange]);

    const uploadFilesList = async (files: File[]) => {
      const validFiles = files.filter((f) => f.size <= 100 * 1024 * 1024);
      if (validFiles.length < files.length) {
        toast.error("Không được upload file vượt quá 100MB.");
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
        if (!activeConversationId) throw new Error("No active conversation");

        const presignRequests = newUploads.map((u) => ({
          fileName: u.name,
          mimeType: u.mimeType,
          sizeBytes: u.sizeBytes,
        }));

        const presignedUrls = await getPresignedUrls(
          activeConversationId,
          presignRequests,
        );

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

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, {
              type: "audio/webm",
            });
            const audioFile = new File(
              [audioBlob],
              `voice_message_${Date.now()}.webm`,
              { type: "audio/webm" },
            );
            uploadFilesList([audioFile]);
          }
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        toast.error("Không thể truy cập microphone. V vui lòng cấp quyền.");
      }
    };

    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (recordingIntervalRef.current)
          clearInterval(recordingIntervalRef.current);
      }
    };

    const cancelRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        audioChunksRef.current = []; // Clear chunks to prevent upload
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (recordingIntervalRef.current)
          clearInterval(recordingIntervalRef.current);
      }
    };

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
        toast.warning("Vui lòng đợi file tải lên hoàn tất.");
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
      setInterimMessage("");
      setUploadingMedia([]);
      setMentions([]);
      setMentionQuery(null);

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingChange?.(false);
      }
    }, [message, uploadingMedia, isUploading, onSendMessage, onTypingChange]);

    const currentMember = activeConversation?.members?.find(
      (m: any) => m.userId === authUserId,
    );
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
            Chỉ quản trị viên mới có thể nhắn tin
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 bg-white border-t border-gray-200">
        {/* File Previews */}
        {uploadingMedia.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-2">
            {uploadingMedia.map((media) => (
              <div
                key={media.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-[220px] ${media.status === "error" ? "bg-red-50 border border-red-200" : "bg-gray-100"}`}
              >
                {media.mimeType.startsWith("image/") ? (
                  <ImageIcon
                    size={16}
                    className={`${media.status === "error" ? "text-red-500" : "text-blue-500"} flex-shrink-0`}
                  />
                ) : (
                  <FileText
                    size={16}
                    className={`${media.status === "error" ? "text-red-500" : "text-gray-500"} flex-shrink-0`}
                  />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span
                    className={`text-xs truncate ${media.status === "error" ? "text-red-700" : "text-gray-700"}`}
                  >
                    {media.name}
                  </span>
                  <span
                    className={`text-[10px] ${media.status === "error" ? "text-red-400" : "text-gray-400"}`}
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

                {media.status !== "uploading" && (
                  <button
                    onClick={() => removeFile(media.id)}
                    className="text-gray-500 hover:text-red-500 transition ml-1 flex-shrink-0 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all relative">
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

          {/* Attachment Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              disabled={isUploading}
              className={`cursor-pointer p-2 rounded-full transition-colors ${showOptions ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-200"}`}
            >
              <Plus
                size={20}
                className={`transition-transform ${showOptions ? "rotate-45" : ""}`}
              />
            </button>

            {showOptions && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[165px] animate-in fade-in zoom-in-95 duration-200 z-10">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  <Paperclip size={16} className="text-gray-500" /> Tài liệu
                </button>
                
                <div className="h-px bg-gray-100 my-1"></div>
                
                <button disabled={isUploading} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left cursor-pointer disabled:opacity-50">
                  <CheckSquare size={16} className="text-green-500" /> Công việc
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
                    <BarChart2 size={16} className="text-purple-500" /> Bình chọn
                  </button>
                )}

                <button disabled={isUploading} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left cursor-pointer disabled:opacity-50">
                  <Calendar size={16} className="text-orange-500" /> Sự kiện
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
                    <FileText size={16} className="text-yellow-500" /> Ghi chú
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

          {/* Message Textarea */}
          <textarea
            id="chat-input-textarea"
            ref={textareaRef}
            value={
              message +
              (interimMessage ? (message ? " " : "") + interimMessage : "")
            }
            onChange={(e) => {
              if (interimMessage) {
                // Nếu người dùng gõ phím khi đang có interimMessage, ta chốt luôn interimMessage vào message
                setMessage(e.target.value);
                setInterimMessage("");
              } else {
                handleTyping(e.target.value, e.target.selectionStart);
              }
            }}
            placeholder={
              activeConversation?.type === "DIRECT"
                ? `Nhập tin nhắn tới ${
                    memberProfiles?.[
                      activeConversation.members?.find(
                        (m: any) => m.userId !== authUserId,
                      )?.userId
                    ]?.fullName || "người dùng"
                  }...`
                : "Nhập @, tin nhắn tới nhóm " + activeConversation?.name
            }
            disabled={isUploading}
            className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none px-2 py-2 text-gray-800 placeholder-gray-400 disabled:opacity-50"
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

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1 pb-1 relative">
            {isRecording ? (
              <div className="flex items-center gap-3 px-2 flex-1 animate-in fade-in">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-red-500 font-medium text-sm flex-1">
                  {formatTime(recordingTime)}
                </span>
                <button
                  onClick={cancelRecording}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-200 rounded-full transition"
                  title="Hủy ghi âm"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={stopRecording}
                  className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition"
                  title="Gửi"
                >
                  <Send size={18} className="mr-0.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <button
                    ref={emojiButtonRef}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`cursor-pointer p-2 rounded-full transition-colors ${showEmojiPicker ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"}`}
                    disabled={isUploading}
                    title="Chèn biểu tượng cảm xúc"
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

                {/* Unified Mic Button */}
                <div className="relative">
                  <button
                    onClick={() => {
                      if (isDictating) {
                        toggleDictation(); // Tắt đọc chính tả nếu đang bật
                      } else {
                        setShowMicOptions(!showMicOptions);
                      }
                    }}
                    className={`cursor-pointer p-2 rounded-full transition-colors ${isDictating ? "bg-red-100 text-red-600 animate-pulse" : showMicOptions ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"}`}
                    title="Tuỳ chọn giọng nói"
                    disabled={isUploading}
                  >
                    {isDictating ? <Mic size={20} /> : <Mic size={20} />}
                  </button>

                  {showMicOptions && !isDictating && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-200 z-10">
                      <button
                        onClick={() => {
                          setShowMicOptions(false);
                          startRecording();
                        }}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
                      >
                        <Voicemail size={16} className="text-blue-500" /> Gửi
                        bản ghi âm
                      </button>
                      <button
                        onClick={() => {
                          setShowMicOptions(false);
                          toggleDictation();
                        }}
                        className=" flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
                      >
                        <Type size={16} className="text-green-500" /> Gửi dạng
                        văn bản
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className={`p-2 rounded-full transition-colors flex items-center justify-center ${(message.trim() || uploadingMedia.some((m) => m.status === "success")) && !isUploading ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400"}`}
                  disabled={
                    (!message.trim() && uploadingMedia.length === 0) ||
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
    );
  }),
);

export default ChatInput;
