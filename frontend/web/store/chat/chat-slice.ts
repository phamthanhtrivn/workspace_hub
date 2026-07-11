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
  watermarks: Record<string, string>; // userId -> messageId
}

const initialState: ChatState = {
  activeConversation: null,
  memberProfiles: {},
  isMobileSidebarOpen: false,
  selectedProfileUserId: null,
  watermarks: {},
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
    updateWatermark: (
      state,
      action: PayloadAction<{ userId: string; messageId: string }>,
    ) => {
      state.watermarks[action.payload.userId] = action.payload.messageId;
    },
    setWatermarks: (state, action: PayloadAction<Record<string, string>>) => {
      state.watermarks = action.payload;
    },
  },
});

export const {
  setActiveConversation,
  setMemberProfiles,
  addMemberProfiles,
  toggleMobileSidebar,
  setSelectedProfileUserId,
  updateWatermark,
  setWatermarks,
} = chatSlice.actions;

export default chatSlice.reducer;
