import { api } from "@/lib/axios";

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

export const getPresignedUrls = async (
  conversationId: string,
  files: PresignRequest[],
): Promise<PresignResponse[]> => {
  const response = await api.post("/api/medias/presign", {
    conversationId,
    files,
  });
  return response.data.data;
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
