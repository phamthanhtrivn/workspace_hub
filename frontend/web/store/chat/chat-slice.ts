import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  UserProfileResponse,
  ConversationResponse,
} from "@/features/chat/types/chat.types";

interface ChatState {
  activeConversation: ConversationResponse | null;
  isMobileSidebarOpen: boolean;
  selectedProfileUserId: string | null;
  watermarks: Record<string, string>; // userId -> messageId
  highlightMessageId: string | null;
}

const initialState: ChatState = {
  activeConversation: null,
  isMobileSidebarOpen: false,
  selectedProfileUserId: null,
  watermarks: {},
  highlightMessageId: null,
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
      state.highlightMessageId = null; // Reset highlight when changing conversation
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
    setHighlightMessageId: (state, action: PayloadAction<string | null>) => {
      state.highlightMessageId = action.payload;
    },
    updateGroupSettings: (
      state,
      action: PayloadAction<Partial<ConversationResponse["setting"]>>,
    ) => {
      if (state.activeConversation && state.activeConversation.setting) {
        state.activeConversation.setting = {
          ...state.activeConversation.setting,
          ...action.payload,
        };
      } else if (state.activeConversation) {
        state.activeConversation.setting = action.payload as any;
      }
    },
    updateMemberRole: (
      state,
      action: PayloadAction<{ userId: string; role: any }>,
    ) => {
      if (state.activeConversation && state.activeConversation.members) {
        const member = state.activeConversation.members.find(
          (m) => m.userId === action.payload.userId,
        );
        if (member) {
          member.role = action.payload.role;
        }
      }
    },
    removeMember: (state, action: PayloadAction<string>) => {
      if (state.activeConversation && state.activeConversation.members) {
        state.activeConversation.members =
          state.activeConversation.members.filter(
            (m) => m.userId !== action.payload,
          );
      }
    },
    updateConversationInfo: (
      state,
      action: PayloadAction<{ id: string; name?: string; avatarUrl?: string }>,
    ) => {
      if (
        state.activeConversation &&
        state.activeConversation.id === action.payload.id
      ) {
        if (action.payload.name !== undefined) {
          state.activeConversation.name = action.payload.name;
        }
        if (action.payload.avatarUrl !== undefined) {
          state.activeConversation.avatarUrl = action.payload.avatarUrl;
        }
      }
    },
    updateMuteStatus: (
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        muted: boolean;
      }>,
    ) => {
      if (
        state.activeConversation &&
        state.activeConversation.id === action.payload.conversationId &&
        state.activeConversation.members
      ) {
        const member = state.activeConversation.members.find(
          (m) => m.userId === action.payload.userId,
        );
        if (member) {
          member.muted = action.payload.muted;
        }
      }
    },
  },
});

export const {
  setActiveConversation,
  toggleMobileSidebar,
  setSelectedProfileUserId,
  updateWatermark,
  setWatermarks,
  setHighlightMessageId,
  updateGroupSettings,
  updateMemberRole,
  removeMember,
  updateConversationInfo,
  updateMuteStatus,
} = chatSlice.actions;

export default chatSlice.reducer;
