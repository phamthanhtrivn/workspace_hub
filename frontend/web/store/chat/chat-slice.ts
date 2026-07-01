import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  UserProfileResponse,
  ConversationResponse,
} from "@/features/chat/types/chat.types";

interface ChatState {
  activeConversation: ConversationResponse | null;
  memberProfiles: Record<string, UserProfileResponse> | null;
}

const initialState: ChatState = {
  activeConversation: null,
  memberProfiles: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversation: (
      state,
      action: PayloadAction<ConversationResponse | null>,
    ) => {
      state.activeConversation = action.payload;
    },
    setMemberProfiles: (
      state,
      action: PayloadAction<Record<string, UserProfileResponse> | null>,
    ) => {
      state.memberProfiles = action.payload;
    },
  },
});

export const { setActiveConversation, setMemberProfiles } = chatSlice.actions;

export default chatSlice.reducer;
