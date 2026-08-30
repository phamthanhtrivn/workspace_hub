import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Notification } from "../../features/notification/types/notification.types";
import type { ProjectInvitationNotificationStatus } from "../../features/notification/types/notification.types";

interface NotificationState {
  list: Notification[];
  unreadCount: number;
  total: number;
  loading: boolean;
}

const initialState: NotificationState = {
  list: [],
  unreadCount: 0,
  total: 0,
  loading: false,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setNotifications: (
      state,
      action: PayloadAction<{
        list: Notification[];
        total: number;
        unreadCount: number;
      }>,
    ) => {
      state.list = action.payload.list;
      state.total = action.payload.total;
      state.unreadCount = action.payload.unreadCount;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      if (!state.list.some((n) => n.id === action.payload.id)) {
        state.list.unshift(action.payload);
        state.total += 1;
        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      }
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    markReadSuccess: (state, action: PayloadAction<string>) => {
      const notification = state.list.find((n) => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllReadSuccess: (state) => {
      state.list.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    },
    updateNotificationSuccess: (state, action: PayloadAction<Notification>) => {
      const index = state.list.findIndex(
        (item) => item.id === action.payload.id,
      );
      if (index === -1) return;
      if (!state.list[index].isRead && action.payload.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.list[index] = action.payload;
    },
    setProjectInvitationStatus: (
      state,
      action: PayloadAction<{
        notificationId: string;
        status: ProjectInvitationNotificationStatus;
      }>,
    ) => {
      const notification = state.list.find(
        (item) => item.id === action.payload.notificationId,
      );
      if (!notification) return;
      notification.metadata = {
        ...notification.metadata,
        status: action.payload.status,
        respondedAt: new Date().toISOString(),
      };
      if (!notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    deleteNotificationSuccess: (state, action: PayloadAction<string>) => {
      const notification = state.list.find((n) => n.id === action.payload);
      if (notification) {
        if (!notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.list = state.list.filter((n) => n.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      }
    },
  },
});

export const {
  setLoading,
  setNotifications,
  addNotification,
  setUnreadCount,
  markReadSuccess,
  markAllReadSuccess,
  updateNotificationSuccess,
  setProjectInvitationStatus,
  deleteNotificationSuccess,
} = notificationSlice.actions;

export default notificationSlice.reducer;
