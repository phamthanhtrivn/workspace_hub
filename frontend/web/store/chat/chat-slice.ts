import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  ChatContextType,
  ChatEntity,
  ChatMessageResponse,
  ChatUiType,
} from "@/features/chat/types/chat.types";

interface ActiveThreadPayload {
  id?: string | null;
  messageId: string | null;
  chatId?: string | null;
  chatType?: ChatUiType | null;
  channelId?: string | null;
  conversationId?: string | null;
}

type ActiveThreadMessagePayload = ChatMessageResponse & {
  messageId?: string | null;
  chatId?: string | null;
  chatType?: ChatUiType | null;
};

interface ChatState {
  activeChatId: string | null;
  activeChatType: ChatUiType | null;
  activeSpaceId: string | null;
  isMobileSidebarOpen: boolean;
  selectedProfileUserId: string | null;
  highlightMessageId: string | null;
  activeThreadRootMessageId: string | null;
  activeThreadRootMessage: ChatMessageResponse | null;
  activeThreadChatId: string | null;
  activeThreadChatType: ChatUiType | null;
}

const initialState: ChatState = {
  activeChatId: null,
  activeChatType: null,
  activeSpaceId: null,
  isMobileSidebarOpen: false,
  selectedProfileUserId: null,
  highlightMessageId: null,
  activeThreadRootMessageId: null,
  activeThreadRootMessage: null,
  activeThreadChatId: null,
  activeThreadChatType: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChat: (
      state,
      action: PayloadAction<{
        chatId: string | null;
        chatType?: ChatUiType | null;
      }>,
    ) => {
      state.activeChatId = action.payload.chatId;
      state.activeChatType = action.payload.chatId
        ? action.payload.chatType ?? state.activeChatType
        : null;
      state.highlightMessageId = null;
      state.activeThreadRootMessageId = null;
      state.activeThreadRootMessage = null;
      state.activeThreadChatId = null;
      state.activeThreadChatType = null;
    },
    setActiveConversation: (
      state,
      action: PayloadAction<ChatEntity | null>,
    ) => {
      state.activeChatId = action.payload?.id ?? null;
      state.activeChatType = action.payload ? state.activeChatType : null;
      state.highlightMessageId = null;
      state.activeThreadRootMessageId = null;
      state.activeThreadRootMessage = null;
      state.activeThreadChatId = null;
      state.activeThreadChatType = null;
    },
    setActiveChannel: (state, action: PayloadAction<ChatEntity | null>) => {
      state.activeChatId = action.payload?.id ?? null;
      state.activeChatType = action.payload ? ChatContextType.CHANNEL : null;
      state.highlightMessageId = null;
      state.activeThreadRootMessageId = null;
      state.activeThreadRootMessage = null;
      state.activeThreadChatId = null;
      state.activeThreadChatType = null;
    },
    setActiveDirectMessage: (
      state,
      action: PayloadAction<ChatEntity | null>,
    ) => {
      state.activeChatId = action.payload?.id ?? null;
      state.activeChatType = action.payload
        ? ChatContextType.DIRECT_MESSAGE
        : null;
      state.highlightMessageId = null;
      state.activeThreadRootMessageId = null;
      state.activeThreadRootMessage = null;
      state.activeThreadChatId = null;
      state.activeThreadChatType = null;
    },
    clearActiveChat: (state) => {
      state.activeChatId = null;
      state.activeChatType = null;
      state.highlightMessageId = null;
      state.activeThreadRootMessageId = null;
      state.activeThreadRootMessage = null;
      state.activeThreadChatId = null;
      state.activeThreadChatType = null;
    },
    toggleMobileSidebar: (state) => {
      state.isMobileSidebarOpen = !state.isMobileSidebarOpen;
    },
    setSelectedProfileUserId: (state, action: PayloadAction<string | null>) => {
      state.selectedProfileUserId = action.payload;
    },
    setHighlightMessageId: (state, action: PayloadAction<string | null>) => {
      state.highlightMessageId = action.payload;
    },
    setActiveThreadRootMessage: (
      state,
      action: PayloadAction<
        ActiveThreadMessagePayload | ActiveThreadPayload | null
      >,
    ) => {
      const payload = action.payload;
      const messageId = payload?.messageId ?? payload?.id ?? null;
      const chatId =
        payload?.chatId ?? payload?.channelId ?? payload?.conversationId ?? null;
      const chatType =
        payload?.chatType ??
        (payload?.conversationId
          ? ChatContextType.DIRECT_MESSAGE
          : payload?.channelId
            ? ChatContextType.CHANNEL
            : null);

      state.activeThreadRootMessageId = messageId;
      state.activeThreadRootMessage =
        payload && "senderId" in payload ? payload : null;
      state.activeThreadChatId = messageId ? chatId ?? state.activeChatId : null;
      state.activeThreadChatType = messageId
        ? chatType ?? state.activeChatType
        : null;
    },
    setActiveSpaceId: (state, action: PayloadAction<string | null>) => {
      state.activeSpaceId = action.payload;
    },
    updateMuteStatus: (_state, _action: PayloadAction<unknown>) => {},
    updatePinStatus: (_state, _action: PayloadAction<unknown>) => {},
    updateChannelSettings: (_state, _action: PayloadAction<unknown>) => {},
    updateMemberRole: (_state, _action: PayloadAction<unknown>) => {},
    removeMember: (_state, _action: PayloadAction<unknown>) => {},
    updateConversationInfo: (_state, _action: PayloadAction<unknown>) => {},
    updateWatermark: (_state, _action: PayloadAction<unknown>) => {},
    setWatermarks: (_state, _action: PayloadAction<unknown>) => {},
    setDirectConversations: (_state, _action: PayloadAction<unknown>) => {},
    upsertDirectConversation: (_state, _action: PayloadAction<unknown>) => {},
    setDirectConversationsLoading: (_state, _action: PayloadAction<unknown>) => {},
    setSpaceChannels: (_state, _action: PayloadAction<unknown>) => {},
    setSpaceChannelsLoading: (_state, _action: PayloadAction<unknown>) => {},
    upsertSpaceChannel: (_state, _action: PayloadAction<unknown>) => {},
    patchSpaceChannel: (_state, _action: PayloadAction<unknown>) => {},
    clearSpaceChannelUnread: (_state, _action: PayloadAction<unknown>) => {},
    upsertSpaceChannelMember: (_state, _action: PayloadAction<unknown>) => {},
    removeSpaceChannelMember: (_state, _action: PayloadAction<unknown>) => {},
    updateSpaceChannelMember: (_state, _action: PayloadAction<unknown>) => {},
    mergeMemberProfiles: (_state, _action: PayloadAction<unknown>) => {},
  },
});

export const {
  setActiveChat,
  setActiveConversation,
  setActiveChannel,
  setActiveDirectMessage,
  clearActiveChat,
  toggleMobileSidebar,
  setSelectedProfileUserId,
  setHighlightMessageId,
  setActiveThreadRootMessage,
  setActiveSpaceId,
  updateMuteStatus,
  updatePinStatus,
  updateChannelSettings,
  updateMemberRole,
  removeMember,
  updateConversationInfo,
  updateWatermark,
  setWatermarks,
  setDirectConversations,
  upsertDirectConversation,
  setDirectConversationsLoading,
  setSpaceChannels,
  setSpaceChannelsLoading,
  upsertSpaceChannel,
  patchSpaceChannel,
  clearSpaceChannelUnread,
  upsertSpaceChannelMember,
  removeSpaceChannelMember,
  updateSpaceChannelMember,
  mergeMemberProfiles,
} = chatSlice.actions;

export default chatSlice.reducer;
