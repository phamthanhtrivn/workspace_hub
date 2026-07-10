import { api } from "@/lib/axios";

export const pollApi = {
  getPollsInConversation: async (conversationId: string) => {
    const response = await api.get(`/api/polls/${conversationId}`, {
      withCredentials: true,
    });
    return response.data;
  },
};
