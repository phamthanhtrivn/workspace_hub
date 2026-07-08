import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  UserProfileResponse,
  ConversationResponse,
} from "@/features/chat/types/chat.types";

interface ChatState {
  activeConversation: ConversationResponse | null;
  memberProfiles: Record<string, UserProfileResponse> | null;
  isMobileSidebarOpen: boolean;
  selectedProfileUserId: string | null;
}

const initialState: ChatState = {
  activeConversation: null,
  memberProfiles: {},
  isMobileSidebarOpen: false,
  selectedProfileUserId: null,
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
    addMemberProfiles: (
      state,
      action: PayloadAction<Record<string, UserProfileResponse>>,
    ) => {
      state.memberProfiles = { ...state.memberProfiles, ...action.payload };
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    },
    setSelectedProfileUserId: (state, action: PayloadAction<string | null>) => {
      state.selectedProfileUserId = action.payload;
    },
  },
});

export const {
  setActiveConversation,
  setMemberProfiles,
  addMemberProfiles,
  toggleMobileSidebar,
  setSelectedProfileUserId,
} = chatSlice.actions;

export default chatSlice.reducer;
