import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserProfileResponse } from "@/features/chat/types/chat.types";

interface ChatState {
  activeConversationId: string | null;
  memberProfile: UserProfileResponse | null;
}

const initialState: ChatState = {
  activeConversationId: null,
  memberProfile: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveConversationId: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload;
    },
    setMemberProfile: (state, action: PayloadAction<UserProfileResponse | null>) => {
      state.memberProfile = action.payload;
    },
  },
});

export const { setActiveConversationId, setMemberProfile } = chatSlice.actions;

export default chatSlice.reducer;
