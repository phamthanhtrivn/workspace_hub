"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useAppSelector } from "@/store/store";
import { getPresignedUrls, uploadToS3 } from "../api/media.api";
import { toast } from "react-toastify";

interface ChatInputProps {
  onSendMessage?: (content: string, media?: any[]) => void;
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

const ChatInput = React.memo(function ChatInput({
  onSendMessage,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<UploadingMedia[]>([]);
  const isUploading = uploadingMedia.some((m) => m.status === "uploading");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConversationId = useAppSelector(
    (state) => state.chat.activeConversation?.id,
  );

  useEffect(() => {
    if (activeConversationId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeConversationId]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const newFiles = Array.from(e.target.files);
        const validFiles = newFiles.filter((f) => f.size <= 100 * 1024 * 1024);
        if (validFiles.length < newFiles.length) {
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
        e.target.value = "";

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
                toast.error(`Lỗi khi tải lên file ${upload.name}`);
              }
            } catch (err) {
              setUploadingMedia((prev) =>
                prev.map((m) =>
                  m.id === upload.id ? { ...m, status: "error" } : m,
                ),
              );
              toast.error(`Lỗi khi tải lên file ${upload.name}`);
            }
          });
        } catch (error) {
          console.error(error);
          toast.error("Không thể khởi tạo phiên tải lên.");
          setUploadingMedia((prev) =>
            prev.map((m) =>
              newUploads.find((nu) => nu.id === m.id)
                ? { ...m, status: "error" }
                : m,
            ),
          );
        }
      }
    },
    [activeConversationId],
  );

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

    onSendMessage(message.trim(), mediaList.length > 0 ? mediaList : undefined);
    setMessage("");
    setUploadingMedia([]);
  }, [message, uploadingMedia, isUploading, onSendMessage]);

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

      <div className="flex items-end gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
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
            className={`p-2 rounded-full transition-colors ${showOptions ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:bg-gray-200"}`}
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
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left cursor-pointer"
              >
                <Paperclip size={16} className="text-gray-500" /> File
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <CheckSquare size={16} className="text-green-500" /> Task
              </button>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <BarChart2 size={16} className="text-purple-500" /> Poll
              </button>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <Calendar size={16} className="text-orange-500" /> Event
              </button>
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition text-left">
                <FileText size={16} className="text-yellow-500" /> Note
              </button>
            </div>
          )}
        </div>

        {/* Message Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={isUploading}
          className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none px-2 py-2 text-gray-800 placeholder-gray-400 disabled:opacity-50"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 pb-1">
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition"
            disabled={isUploading}
          >
            <Smile size={20} />
          </button>
          <button
            className={`p-2 rounded-full transition-colors flex items-center justify-center ${(message.trim() || uploadingMedia.some((m) => m.status === "success")) && !isUploading ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-400"}`}
            disabled={
              (!message.trim() && uploadingMedia.length === 0) || isUploading
            }
            onClick={handleSend}
          >
            <Send size={18} className="mr-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChatInput;
