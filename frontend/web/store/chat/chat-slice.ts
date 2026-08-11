import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  ChatProfilesMap,
  ConversationResponse,
} from "@/features/chat/types/chat.types";

interface ChatState {
  activeConversation: ConversationResponse | null;
  activeChannel: ConversationResponse | null;
  activeDirectMessage: ConversationResponse | null;
  activeChatType: "CHANNEL" | "DIRECT" | null;
  isMobileSidebarOpen: boolean;
  selectedProfileUserId: string | null;
  watermarks: Record<string, string>; // userId -> messageId
  highlightMessageId: string | null;
  activeThreadRootMessage: any | null;
  activeSpaceId: string | null;
  directMessages: {
    conversations: ConversationResponse[];
    loading: boolean;
  };
  spaceChannels: {
    bySpaceId: Record<string, ConversationResponse[]>;
    loadingBySpaceId: Record<string, boolean>;
  };
  memberProfiles: ChatProfilesMap;
}

const initialState: ChatState = {
  activeConversation: null,
  activeChannel: null,
  activeDirectMessage: null,
  activeChatType: null,
  isMobileSidebarOpen: false,
  selectedProfileUserId: null,
  watermarks: {},
  highlightMessageId: null,
  activeThreadRootMessage: null,
  activeSpaceId: null,
  directMessages: {
    conversations: [],
    loading: false,
  },
  spaceChannels: {
    bySpaceId: {},
    loadingBySpaceId: {},
  },
  memberProfiles: {},
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
      state.activeThreadRootMessage = null; // Reset thread when changing conversation
      
      if (!action.payload) {
        state.activeChatType = null;
      } else if (action.payload.type === "DIRECT") {
        state.activeDirectMessage = action.payload;
        state.activeChatType = "DIRECT";
      } else {
        state.activeChannel = action.payload;
        state.activeChatType = "CHANNEL";
      }
    },
    setActiveChannel: (
      state,
      action: PayloadAction<ConversationResponse | null>,
    ) => {
      state.activeChannel = action.payload;
      if (action.payload) {
        state.activeConversation = action.payload;
        state.activeChatType = "CHANNEL";
      } else if (state.activeChatType === "CHANNEL") {
        state.activeConversation = null;
        state.activeChatType = null;
      }
    },
    setActiveDirectMessage: (
      state,
      action: PayloadAction<ConversationResponse | null>,
    ) => {
      state.activeDirectMessage = action.payload;
      if (action.payload) {
        state.activeConversation = action.payload;
        state.activeChatType = "DIRECT";
      } else if (state.activeChatType === "DIRECT") {
        state.activeConversation = null;
        state.activeChatType = null;
      }
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
    updateChannelSettings: (
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
    updatePinStatus: (
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        pinned: boolean;
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
          member.pinned = action.payload.pinned;
        }
      }
    },
    setActiveThreadRootMessage: (state, action: PayloadAction<any | null>) => {
      state.activeThreadRootMessage = action.payload;
    },
    setActiveSpaceId: (state, action: PayloadAction<string | null>) => {
      state.activeSpaceId = action.payload;
    },
    setDirectConversations: (
      state,
      action: PayloadAction<ConversationResponse[]>,
    ) => {
      state.directMessages.conversations = action.payload;
    },
    upsertDirectConversation: (
      state,
      action: PayloadAction<ConversationResponse>,
    ) => {
      const conversation = action.payload;
      const existingIndex = state.directMessages.conversations.findIndex(
        (item) => item.id === conversation.id,
      );
      if (existingIndex >= 0) {
        state.directMessages.conversations[existingIndex] = conversation;
      } else {
        state.directMessages.conversations.unshift(conversation);
      }
    },
    setDirectConversationsLoading: (state, action: PayloadAction<boolean>) => {
      state.directMessages.loading = action.payload;
    },
    setSpaceChannels: (
      state,
      action: PayloadAction<{
        spaceId: string;
        channels: ConversationResponse[];
      }>,
    ) => {
      state.spaceChannels.bySpaceId[action.payload.spaceId] =
        action.payload.channels;
    },
    setSpaceChannelsLoading: (
      state,
      action: PayloadAction<{ spaceId: string; loading: boolean }>,
    ) => {
      state.spaceChannels.loadingBySpaceId[action.payload.spaceId] =
        action.payload.loading;
    },
    upsertSpaceChannel: (
      state,
      action: PayloadAction<{ spaceId: string; channel: ConversationResponse }>,
    ) => {
      const { spaceId, channel } = action.payload;
      const channels = state.spaceChannels.bySpaceId[spaceId] || [];
      const existingIndex = channels.findIndex((item) => item.id === channel.id);
      if (existingIndex >= 0) {
        channels[existingIndex] = channel;
      } else {
        channels.push(channel);
      }
      state.spaceChannels.bySpaceId[spaceId] = channels;
    },
    mergeMemberProfiles: (state, action: PayloadAction<ChatProfilesMap>) => {
      state.memberProfiles = {
        ...state.memberProfiles,
        ...action.payload,
      };
    },
  },
});

export const {
  setActiveConversation,
  setActiveChannel,
  setActiveDirectMessage,
  toggleMobileSidebar,
  setSelectedProfileUserId,
  updateWatermark,
  setWatermarks,
  setHighlightMessageId,
  updateChannelSettings,
  updateMemberRole,
  removeMember,
  updateConversationInfo,
  updateMuteStatus,
  updatePinStatus,
  setActiveThreadRootMessage,
  setActiveSpaceId,
  setDirectConversations,
  upsertDirectConversation,
  setDirectConversationsLoading,
  setSpaceChannels,
  setSpaceChannelsLoading,
  upsertSpaceChannel,
  mergeMemberProfiles,
} = chatSlice.actions;

export default chatSlice.reducer;
