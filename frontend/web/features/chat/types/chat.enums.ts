// ─── Context & Role Enums ──────────────────────────────────────────────────

export enum ChatContextType {
  DIRECT_MESSAGE = "DIRECT_MESSAGE",
  CHANNEL = "CHANNEL",
}

/**
 * Role của member trong channel/conversation.
 * Dùng SpaceRole thay vì ConversationRoles (cùng giá trị).
 */
export enum SpaceRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

// ─── Sidebar ───────────────────────────────────────────────────────────────

export enum CHAT_SIDEBAR_TABS {
  ALL = "all",
  PERSONAL = "personal",
  CHANNELS = "channels",
}

export enum CONVERSATION_TYPE {
  DIRECT = "DIRECT",
  CHANNEL = "CHANNEL",
}

// ─── Message ───────────────────────────────────────────────────────────────

/**
 * Kiểu nội dung của một tin nhắn chat.
 * Dùng thay cho các magic string "POLL", "NOTE", "TEXT", v.v.
 */
export enum MessageType {
  TEXT = "TEXT",
  POLL = "POLL",
  NOTE = "NOTE",
  TASK = "TASK",
  SYSTEM = "SYSTEM",
  EVENT = "EVENT",
}

/**
 * Danh sách các loại tin nhắn không hiển thị avatar người gửi.
 * Tương đương NO_AVATAR_TYPES array nhưng type-safe hơn khi dùng với MessageType.
 */
export const NO_AVATAR_MESSAGE_TYPES: MessageType[] = [
  MessageType.POLL,
  MessageType.NOTE,
  MessageType.TASK,
  MessageType.SYSTEM,
  MessageType.EVENT,
];

// ─── Reaction ──────────────────────────────────────────────────────────────

/**
 * Hành động reaction trên một tin nhắn.
 * Dùng thay cho magic string "add" | "remove" | "update".
 */
export enum ReactionAction {
  ADD = "add",
  REMOVE = "remove",
  UPDATE = "update",
}

// ─── Socket ACK ────────────────────────────────────────────────────────────

/**
 * Trạng thái phản hồi từ socket ACK.
 * Dùng thay cho magic string "success" | "error".
 */
export enum SocketAckStatus {
  SUCCESS = "success",
  ERROR = "error",
}

// ─── Invitation ────────────────────────────────────────────────────────────

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}
