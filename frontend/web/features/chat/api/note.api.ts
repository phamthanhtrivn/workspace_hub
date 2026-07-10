import { api } from "@/lib/axios";

export const noteApi = {
  getNotesInConversation: async (conversationId: string) => {
    const response = await api.get(`/api/notes/${conversationId}`, {
      withCredentials: true,
    });
    return response.data;
  },
};
