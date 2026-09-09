import type { CreateInstantMeetingDto } from '../dto/create-instant-meeting.dto';
import type { CreateScheduledMeetingDto } from '../dto/create-scheduled-meeting.dto';
import type { CreateMeetingMessageDto } from '../dto/create-meeting-message.dto';
import type { EditMeetingMessageDto } from '../dto/edit-meeting-message.dto';
import type { ListJoinRequestsDto } from '../dto/list-join-requests.dto';
import type { ListMeetingHistoryDto } from '../dto/list-meeting-history.dto';
import type { ListMeetingMessagesDto } from '../dto/list-meeting-messages.dto';
import type { ListMeetingParticipantsDto } from '../dto/list-meeting-participants.dto';
import type { MeetingMessageReactionDto } from '../dto/meeting-message-reaction.dto';
import type { ReadMeetingMessageDto } from '../dto/read-meeting-message.dto';
import type { StartMeetingScreenShareDto } from '../dto/start-meeting-screen-share.dto';
import type { UpdateMeetingChatNotificationPreferenceDto } from '../dto/update-meeting-chat-notification-preference.dto';
import type { UpdateMeetingParticipantViewPreferenceDto } from '../dto/update-meeting-participant-view-preference.dto';
import type { UpdateMeetingParticipantRoleDto } from '../dto/update-meeting-participant-role.dto';
import type { UpdateMeetingSettingsDto } from '../dto/update-meeting-settings.dto';
import type { UpdateScheduledMeetingDto } from '../dto/update-scheduled-meeting.dto';

export interface CreateInstantMeetingParams {
  userId: string;
  userName?: string;
  avatarUrl?: string;
  dto?: CreateInstantMeetingDto;
}

export interface CreateScheduledMeetingParams {
  userId: string;
  userName?: string;
  avatarUrl?: string;
  dto: CreateScheduledMeetingDto;
}

export interface JoinMeetingParams extends CreateInstantMeetingParams {
  joinToken: string;
}

export interface GetMeetingAccessParams {
  joinToken: string;
  userId: string;
}

export type MeetingModeratorParams = GetMeetingAccessParams;

export interface StartScheduledMeetingParams extends CreateInstantMeetingParams {
  joinToken: string;
}

export interface UpdateScheduledMeetingParams extends MeetingModeratorParams {
  dto: UpdateScheduledMeetingDto;
}

export interface CancelScheduledMeetingParams extends MeetingModeratorParams {}

export interface EndMeetingFromLiveKitRoomFinishedParams {
  roomName: string;
  endedAt?: Date;
  webhookEventId?: string;
}

export interface MeetingJoinRequestParams extends CreateInstantMeetingParams {
  joinToken: string;
}

export interface ListJoinRequestsParams extends MeetingModeratorParams {
  query?: ListJoinRequestsDto;
}

export interface ListMeetingParticipantsParams extends MeetingModeratorParams {
  query?: ListMeetingParticipantsDto;
}

export interface ListMeetingHistoryParams {
  userId: string;
  query?: ListMeetingHistoryDto;
}

export interface ListMeetingHistorySummaryParams {
  userId: string;
}

export interface ListUpcomingMeetingsParams {
  userId: string;
  query?: {
    page?: number;
    limit?: number;
  };
}

export interface MeetingHistorySummaryResponse {
  totalMeetings: number;
  liveMeetings: number;
  endedMeetings: number;
  hostedMeetings: number;
  totalMinutes: number;
  lastMeetingAt: string | null;
}

export interface ResolveJoinRequestParams extends MeetingModeratorParams {
  targetUserId: string;
}

export interface UpdateMeetingSettingsParams extends MeetingModeratorParams {
  dto: UpdateMeetingSettingsDto;
}

export interface StartMeetingScreenShareParams extends MeetingModeratorParams {
  dto?: StartMeetingScreenShareDto;
}

export type StopMeetingScreenShareParams = MeetingModeratorParams;

export interface TargetMeetingParticipantParams extends MeetingModeratorParams {
  targetUserId: string;
}

export type StopTargetMeetingScreenShareParams = TargetMeetingParticipantParams;

export interface UpdateMeetingParticipantRoleParams extends TargetMeetingParticipantParams {
  dto: UpdateMeetingParticipantRoleDto;
}

export type ListMeetingParticipantViewPreferencesParams =
  MeetingModeratorParams;

export interface UpdateMeetingParticipantViewPreferenceParams extends TargetMeetingParticipantParams {
  dto: UpdateMeetingParticipantViewPreferenceDto;
}

export interface UpdateMeetingChatNotificationPreferenceParams extends MeetingModeratorParams {
  dto: UpdateMeetingChatNotificationPreferenceDto;
}

export interface ListMeetingMessagesParams extends MeetingModeratorParams {
  query?: ListMeetingMessagesDto;
}

export type GetMeetingUnreadMessageCountParams = MeetingModeratorParams;

export interface CreateMeetingMessageParams extends MeetingModeratorParams {
  dto: CreateMeetingMessageDto;
}

export interface TargetMeetingMessageParams extends MeetingModeratorParams {
  messageId: string;
}

export interface EditMeetingMessageParams extends TargetMeetingMessageParams {
  dto: EditMeetingMessageDto;
}

export interface ReactMeetingMessageParams extends TargetMeetingMessageParams {
  dto: MeetingMessageReactionDto;
}

export interface ReadMeetingMessageParams extends MeetingModeratorParams {
  dto: ReadMeetingMessageDto;
}
