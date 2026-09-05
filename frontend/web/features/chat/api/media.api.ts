import { api } from "@/lib/axios";
import { ApiResponse, ChatContextType } from "../types/chat.types";

export interface PresignRequest {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignResponse {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  s3Key: string;
  presignedUrl: string;
}

export interface GetPresignedUrlsParams {
  chatId: string;
  chatType: ChatContextType;
  files: PresignRequest[];
}

interface PresignPayload {
  chatId: string;
  chatType: ChatContextType;
  channelId?: string;
  conversationId?: string;
  files: PresignRequest[];
}

export const getPresignedUrls = async (
  params: GetPresignedUrlsParams,
): Promise<PresignResponse[]> => {
  const payload: PresignPayload = {
    chatId: params.chatId,
    chatType: params.chatType,
    files: params.files,
    ...(params.chatType === ChatContextType.CHANNEL
      ? { channelId: params.chatId }
      : {}),
    ...(params.chatType === ChatContextType.DIRECT_MESSAGE
      ? { conversationId: params.chatId }
      : {}),
  };
  const response = await api.post("/api/medias/presign", {
    ...payload,
  });
  return (response.data as ApiResponse<PresignResponse[]>).data;
};

export const uploadToS3 = async (
  file: File,
  presignedUrl: string,
): Promise<boolean> => {
  try {
    const response = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to upload to S3");
    }
    return true;
  } catch (error) {
    console.error("S3 upload error:", error);
    return false;
  }
};
