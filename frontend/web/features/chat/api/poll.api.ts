import { api } from "@/lib/axios";
import { ApiResponse, PollResponse } from "../types/chat.types";

export const pollApi = {
  getPollsInConversation: async (
    conversationId: string,
    q?: string,
  ): Promise<ApiResponse<PollResponse[]>> => {
    const response = await api.get<ApiResponse<PollResponse[]>>(
      `/api/polls/${conversationId}`,
      {
        params: { q },
        withCredentials: true,
      },
    );
    return response.data;
  },
};
