import { api } from "@/lib/axios";
import { ApiResponse, NoteResponse } from "../types/chat.types";

export const noteApi = {
  getNotesInConversation: async (
    conversationId: string,
    q?: string,
  ): Promise<ApiResponse<NoteResponse[]>> => {
    const response = await api.get<ApiResponse<NoteResponse[]>>(
      `/api/notes/${conversationId}`,
      {
        params: { q },
        withCredentials: true,
      },
    );
    return response.data;
  },
};
