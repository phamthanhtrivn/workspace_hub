export enum MeetingFlowStep {
  DASHBOARD = "dashboard",
  PREJOIN = "prejoin",
  CREATING = "creating",
}

export enum MeetingPreJoinMode {
  CREATE = "create",
  JOIN = "join",
}

export enum MeetingJoinFlowStep {
  CHECKING = "checking",
  PREJOIN = "prejoin",
  PASSWORD = "password",
  WAITING_HOST = "waiting-host",
  WAITING_APPROVAL = "waiting-approval",
  JOINING = "joining",
  ROOM = "room",
  ERROR = "error",
}

export enum MeetingHistoryViewMode {
  GRID = "grid",
  LIST = "list",
}

export enum MeetingDeviceKind {
  CAMERA = "camera",
  MICROPHONE = "microphone",
}

export interface MeetingDeviceOption {
  deviceId: string;
  label: string;
}

export interface MeetingPreJoinSettings {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  cameraDeviceId: string;
  microphoneDeviceId: string;
  autoAdmin: boolean;
  chatEnabled: boolean;
}

export interface CreateInstantMeetingPayload {
  password?: string;
  autoAdmit?: boolean;
  chatEnabled?: boolean;
  title?: string;
  channelId?: string;
  conversationId?: string;
  deviceSettings?: {
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    cameraDeviceId?: string;
    microphoneDeviceId?: string;
  };
}

export enum MEETING_ROLE {
  HOST = "HOST",
  COHOST = "COHOST",
  PARTICIPANT = "PARTICIPANT",
}

export type MeetingParticipantRole = MEETING_ROLE;

export enum MeetingParticipantStatusValue {
  INVITED = "INVITED",
  REQUESTED = "REQUESTED",
  APPROVED = "APPROVED",
  JOINED = "JOINED",
  LEFT = "LEFT",
  REMOVED = "REMOVED",
  REJECTED = "REJECTED",
}

export type MeetingParticipantStatus =
  | "INVITED"
  | "REQUESTED"
  | "APPROVED"
  | "JOINED"
  | "LEFT"
  | "REMOVED"
  | "REJECTED";

export interface InstantMeetingResponse {
  meeting: {
    id: string;
    roomName: string;
    joinToken: string;
    title: string | null;
    description: string | null;
    type: MeetingType;
    status: MeetingStatus;
    autoAdmit: boolean;
    chatEnabled: boolean;
    screenShareEnabled: boolean;
    activeScreenShareUserId: string | null;
    screenShareStartedAt: string | null;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    startedAt: string | null;
    createdAt: string;
    participantRole: MeetingParticipantRole;
    chatMuted: boolean;
  };
  livekit: {
    serverUrl: string;
    token: string;
  };
}

export type MeetingJoinResponse = InstantMeetingResponse | MeetingAccessResponse;

export interface MeetingAccessResponse {
  meetingId: string;
  joinToken: string;
  title: string | null;
  description: string | null;
  type: MeetingType;
  status: MeetingStatus;
  autoAdmit: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  canJoinWithoutApproval: boolean;
  participantRole: MeetingParticipantRole;
  participantStatus: MeetingParticipantStatus | null;
  chatMuted: boolean;
  activeScreenShareUserId: string | null;
  screenShareStartedAt: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  canStart: boolean;
  requiresPassword: boolean;
  errorCode:
    | "MEETING_NOT_STARTED"
    | "MEETING_ALREADY_ENDED"
    | "MEETING_CANCELLED"
    | null;
}

export type JoinMeetingPayload = Pick<
  CreateInstantMeetingPayload,
  "deviceSettings" | "password"
>;

export type RequestMeetingJoinApprovalPayload = Pick<
  CreateInstantMeetingPayload,
  "password"
>;

export enum MeetingRoomPanel {
  NONE = "none",
  PARTICIPANTS = "participants",
  CHAT = "chat",
  ADMISSION = "admission",
  SETTINGS = "settings",
}

export interface MeetingRoomSidePanelProps {
  activePanel: MeetingRoomPanel;
  joinToken: string;
  meetingId: string;
  participantRole: MeetingParticipantRole;
  participantCount: number;
  autoAdmit: boolean;
  onAutoAdmitChange: (autoAdmit: boolean) => void;
  chatEnabled: boolean;
  onChatEnabledChange: (chatEnabled: boolean) => void;
  screenShareEnabled: boolean;
  onScreenShareEnabledChange: (screenShareEnabled: boolean) => void;
  activeScreenShareUserId: string | null;
  chatMuted: boolean;
  isChatNotificationPreferencePending?: boolean;
  onChatMutedChange: (muted: boolean) => void;
  mutedParticipantIds: ReadonlySet<string>;
  pinnedParticipantId: string | null;
  isParticipantViewPreferencePending: (participantId: string) => boolean;
  onToggleParticipantAudioMute: (participantId: string) => void;
  onToggleParticipantPin: (participantId: string) => void;
  onClose: () => void;
}

export type MeetingRoomPanelContentProps = Pick<
  MeetingRoomSidePanelProps,
  | "activePanel"
  | "joinToken"
  | "meetingId"
  | "participantRole"
  | "participantCount"
  | "autoAdmit"
  | "onAutoAdmitChange"
  | "chatEnabled"
  | "onChatEnabledChange"
  | "screenShareEnabled"
  | "onScreenShareEnabledChange"
  | "activeScreenShareUserId"
  | "mutedParticipantIds"
  | "pinnedParticipantId"
  | "isParticipantViewPreferencePending"
  | "onToggleParticipantAudioMute"
  | "onToggleParticipantPin"
>;

export type MeetingRoomSettingsPanelProps = Pick<
  MeetingRoomSidePanelProps,
  | "joinToken"
  | "participantRole"
  | "participantCount"
  | "autoAdmit"
  | "onAutoAdmitChange"
  | "chatEnabled"
  | "onChatEnabledChange"
  | "screenShareEnabled"
  | "onScreenShareEnabledChange"
>;

export interface ParticipantMetadata {
  role?: string;
  avatarUrl?: string | null;
}

export interface MeetingJoinRequestResponse {
  id: string;
  meetingId: string;
  userId: string;
  role: MeetingParticipantRole;
  status: MeetingParticipantStatus;
  requestedAt: string;
  profile: {
    id?: string | null;
    userId?: string | null;
    email: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface MeetingJoinRequestsResponse {
  items: MeetingJoinRequestResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MeetingJoinRequestStatusResponse {
  meetingId: string;
  joinToken?: string;
  userId?: string;
  participantStatus?: MeetingParticipantStatus;
  meetingStatus?: MeetingStatus;
  status?: MeetingParticipantStatus;
  requestedAt?: string;
}

export interface MeetingSettingsResponse {
  meetingId: string;
  joinToken: string;
  autoAdmit: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  activeScreenShareUserId: string | null;
  screenShareStartedAt: string | null;
}

export interface UpdateMeetingSettingsPayload {
  autoAdmit?: boolean;
  chatEnabled?: boolean;
  screenShareEnabled?: boolean;
}

export interface StartMeetingScreenSharePayload {
  interrupt?: boolean;
}

export interface MeetingScreenShareStateResponse {
  meetingId: string;
  joinToken: string;
  screenShareEnabled: boolean;
  activeScreenShareUserId: string | null;
  screenShareStartedAt: string | null;
  startedBy?: string;
  userId?: string;
  stoppedBy?: string;
  reason?: string;
}

export interface MeetingParticipantProfile {
  id?: string | null;
  userId?: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface MeetingParticipantResponse {
  id: string;
  meetingId: string;
  userId: string;
  role: MeetingParticipantRole;
  status: MeetingParticipantStatus;
  joinedAt: string | null;
  leftAt?: string | null;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
  updatedAt?: string;
  profile: MeetingParticipantProfile | null;
}

export interface MeetingParticipantsResponse {
  items: MeetingParticipantResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MeetingPaginatedResponse<TItem> {
  items: TItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type MeetingType = "INSTANT" | "SCHEDULED";

export type MeetingStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";

export interface MeetingHistoryItem {
  id: string;
  joinToken: string;
  type: MeetingType;
  status: MeetingStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  myParticipant: MeetingParticipantResponse;
  participants: MeetingParticipantResponse[];
  participantCount: number;
}

export type MeetingHistoryResponse =
  MeetingPaginatedResponse<MeetingHistoryItem>;

export interface ScheduledMeetingPayload {
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  description?: string | null;
  recurrenceRule?: string | null;
  inviteeIds?: string[];
  password?: string;
  autoAdmit?: boolean;
  chatEnabled?: boolean;
  screenShareEnabled?: boolean;
}

export type UpdateScheduledMeetingPayload = Partial<ScheduledMeetingPayload>;

export interface ScheduledMeetingResponse {
  id: string;
  joinToken: string;
  title: string;
  description: string | null;
  type: "SCHEDULED";
  status: MeetingStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  autoAdmit: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  requiresPassword: boolean;
  participants: MeetingParticipantResponse[];
}

export interface ScheduledMeetingInvitationResponse {
  meetingId: string;
  joinToken: string;
  status: Extract<MeetingParticipantStatus, "APPROVED" | "REJECTED">;
  respondedAt: string;
}

export interface UpcomingMeetingItem {
  id: string;
  joinToken: string;
  title: string;
  description: string | null;
  type: "SCHEDULED";
  status: MeetingStatus;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  hostUserId: string;
  hostProfile: MeetingParticipantProfile | null;
  myParticipant: MeetingParticipantResponse | null;
  participants: MeetingParticipantResponse[];
  participantCount: number;
  autoAdmit: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  requiresPassword: boolean;
}

export type UpcomingMeetingsResponse =
  MeetingPaginatedResponse<UpcomingMeetingItem>;

export interface MeetingHistorySummaryResponse {
  totalMeetings: number;
  liveMeetings: number;
  endedMeetings: number;
  hostedMeetings: number;
  totalMinutes: number;
  lastMeetingAt: string | null;
}

export interface MeetingEndedResponse {
  meetingId: string;
  joinToken: string;
  status: "ENDED";
  autoAdmit: boolean;
  chatEnabled: boolean;
  screenShareEnabled: boolean;
  activeScreenShareUserId: string | null;
  screenShareStartedAt: string | null;
  endedBy: string;
  endedAt: string;
}

export interface MeetingMessageMediaPayload {
  name: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
}

export interface MeetingMessageMediaResponse extends MeetingMessageMediaPayload {
  id: string;
  messageId?: string;
  fileUrl: string;
  type?: "IMAGE" | "VIDEO" | "FILE" | string;
}

export interface MeetingMessageReactionResponse {
  id?: string;
  messageId?: string;
  userId: string;
  emoji: string;
}

export interface MeetingMessageResponse {
  id: string;
  meetingId: string;
  senderId: string;
  content?: string | null;
  type: "TEXT" | string;
  edited: boolean;
  recalled: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  senderProfile?: MeetingParticipantProfile | null;
  medias?: MeetingMessageMediaResponse[];
  reactions?: MeetingMessageReactionResponse[];
}

export interface MeetingMessagesResponse {
  messages: MeetingMessageResponse[];
  nextCursor?: string;
  prevCursor?: string;
}

export interface MeetingUnreadMessageCountResponse {
  count: number;
}

export interface MeetingChatNotificationPreferenceResponse {
  meetingId: string;
  joinToken: string;
  userId: string;
  chatMuted: boolean;
}

export interface MeetingParticipantViewPreferenceResponse {
  meetingId: string;
  viewerUserId: string;
  targetUserId: string;
  audioMuted: boolean;
  pinned: boolean;
  updatedAt: string;
}

export interface MeetingParticipantViewPreferencesResponse {
  items: MeetingParticipantViewPreferenceResponse[];
}

export interface UpdateMeetingParticipantViewPreferencePayload {
  audioMuted?: boolean;
  pinned?: boolean;
}

export interface CreateMeetingMessagePayload {
  content?: string;
  medias?: MeetingMessageMediaPayload[];
}

export interface EditMeetingMessagePayload {
  content: string;
}

export interface MeetingMessageReactionPayload {
  emoji: string;
}

export interface MeetingMessageReactionResult {
  action: "add" | "remove" | "update";
  emoji: string;
}

export interface MeetingMessageReadReceiptResponse {
  meetingId: string;
  joinToken: string;
  messageId: string;
  userId: string;
  readAt: string;
}
