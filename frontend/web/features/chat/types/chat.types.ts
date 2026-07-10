export const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export interface UserSearchResponse {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface UserProfileResponse {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  dob: string | null;
  bio: string | null;
}

export type ConversationType = "DIRECT" | "GROUP";
export type ConversationRole = "OWNER" | "ADMIN" | "MEMBER";

export interface ConversationSetting {
  id: string;
  allowMemberInvite: boolean;
  approvalRequired: boolean;
  allowSendMessage: boolean;
  allowCreatePoll: boolean;
  allowCreateNote: boolean;
  allowPinMessage: boolean;
}

export interface ConversationMember {
  id: string;
  userId: string;
  joinedAt: string;
  lastReadMessageId: string | null;
  muted: boolean;
  nickname: string | null;
  role: ConversationRole;
}

export interface ConversationResponse {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  setting?: ConversationSetting | null;
  members: ConversationMember[];
  messages?: any[];
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export interface GroupInvitation {
  id: string;
  conversationId: string;
  invitedUserId: string;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt?: string;
  conversation?: any; // To hold full conversation info
}
