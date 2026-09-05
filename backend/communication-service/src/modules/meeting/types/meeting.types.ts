import type { CreateInstantMeetingDto } from '../dto/create-instant-meeting.dto';
import type { ListJoinRequestsDto } from '../dto/list-join-requests.dto';
import type { ListMeetingParticipantsDto } from '../dto/list-meeting-participants.dto';
import type { UpdateMeetingParticipantRoleDto } from '../dto/update-meeting-participant-role.dto';
import type { UpdateMeetingSettingsDto } from '../dto/update-meeting-settings.dto';

export interface CreateInstantMeetingParams {
  userId: string;
  userName?: string;
  avatarUrl?: string;
  dto?: CreateInstantMeetingDto;
}

export interface JoinMeetingParams extends CreateInstantMeetingParams {
  joinToken: string;
}

export interface GetMeetingAccessParams {
  joinToken: string;
  userId: string;
}

export interface MeetingModeratorParams extends GetMeetingAccessParams {}

export interface MeetingJoinRequestParams extends CreateInstantMeetingParams {
  joinToken: string;
}

export interface ListJoinRequestsParams extends MeetingModeratorParams {
  query?: ListJoinRequestsDto;
}

export interface ListMeetingParticipantsParams
  extends MeetingModeratorParams {
  query?: ListMeetingParticipantsDto;
}

export interface ResolveJoinRequestParams extends MeetingModeratorParams {
  targetUserId: string;
}

export interface UpdateMeetingSettingsParams extends MeetingModeratorParams {
  dto: UpdateMeetingSettingsDto;
}

export interface TargetMeetingParticipantParams extends MeetingModeratorParams {
  targetUserId: string;
}

export interface UpdateMeetingParticipantRoleParams
  extends TargetMeetingParticipantParams {
  dto: UpdateMeetingParticipantRoleDto;
}
