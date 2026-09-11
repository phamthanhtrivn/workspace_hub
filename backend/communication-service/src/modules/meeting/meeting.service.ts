import { Injectable } from '@nestjs/common';
import { MeetingAdmissionService } from './services/meeting-admission.service';
import { MeetingHistoryService } from './services/meeting-history.service';
import { MeetingParticipantService } from './services/meeting-participant.service';
import { MeetingRoomService } from './services/meeting-room.service';
import { MeetingScreenShareService } from './services/meeting-screen-share.service';
import type {
  CreateInstantMeetingParams,
  GetMeetingAccessParams,
  JoinMeetingParams,
  ListJoinRequestsParams,
  ListMeetingHistoryParams,
  ListMeetingHistorySummaryParams,
  ListMeetingParticipantViewPreferencesParams,
  ListMeetingParticipantsParams,
  MeetingJoinRequestParams,
  MeetingModeratorParams,
  ResolveJoinRequestParams,
  StartMeetingScreenShareParams,
  StopMeetingScreenShareParams,
  StopTargetMeetingScreenShareParams,
  TargetMeetingParticipantParams,
  UpdateMeetingChatNotificationPreferenceParams,
  UpdateMeetingParticipantViewPreferenceParams,
  UpdateMeetingParticipantRoleParams,
  UpdateMeetingSettingsParams,
} from './types/meeting.types';

@Injectable()
export class MeetingService {
  constructor(
    private readonly meetingRoomService: MeetingRoomService,
    private readonly meetingParticipantService: MeetingParticipantService,
    private readonly meetingAdmissionService: MeetingAdmissionService,
    private readonly meetingHistoryService: MeetingHistoryService,
    private readonly meetingScreenShareService: MeetingScreenShareService,
  ) {}

  createInstantMeeting(params: CreateInstantMeetingParams) {
    return this.meetingRoomService.createInstantMeeting(params);
  }

  getMeetingAccess(params: GetMeetingAccessParams) {
    return this.meetingRoomService.getMeetingAccess(params);
  }

  joinMeeting(params: JoinMeetingParams) {
    return this.meetingRoomService.joinMeeting(params);
  }

  listMeetingHistory(params: ListMeetingHistoryParams) {
    return this.meetingHistoryService.listMeetingHistory(params);
  }

  listMeetingHistorySummary(params: ListMeetingHistorySummaryParams) {
    return this.meetingHistoryService.listMeetingHistorySummary(params);
  }

  updateMeetingSettings(params: UpdateMeetingSettingsParams) {
    return this.meetingRoomService.updateMeetingSettings(params);
  }

  startScreenShare(params: StartMeetingScreenShareParams) {
    return this.meetingScreenShareService.startScreenShare(params);
  }

  stopScreenShare(params: StopMeetingScreenShareParams) {
    return this.meetingScreenShareService.stopScreenShare(params);
  }

  stopParticipantScreenShare(params: StopTargetMeetingScreenShareParams) {
    return this.meetingScreenShareService.stopParticipantScreenShare(params);
  }

  listMeetingParticipants(params: ListMeetingParticipantsParams) {
    return this.meetingParticipantService.listMeetingParticipants(params);
  }

  listMeetingParticipantViewPreferences(
    params: ListMeetingParticipantViewPreferencesParams,
  ) {
    return this.meetingParticipantService.listMeetingParticipantViewPreferences(
      params,
    );
  }

  leaveMeeting(params: MeetingModeratorParams) {
    return this.meetingParticipantService.leaveMeeting(params);
  }

  endMeeting(params: MeetingModeratorParams) {
    return this.meetingRoomService.endMeeting(params);
  }

  removeParticipant(params: TargetMeetingParticipantParams) {
    return this.meetingParticipantService.removeParticipant(params);
  }

  updateParticipantRole(params: UpdateMeetingParticipantRoleParams) {
    return this.meetingParticipantService.updateParticipantRole(params);
  }

  updateChatNotificationPreference(
    params: UpdateMeetingChatNotificationPreferenceParams,
  ) {
    return this.meetingParticipantService.updateChatNotificationPreference(
      params,
    );
  }

  updateParticipantViewPreference(
    params: UpdateMeetingParticipantViewPreferenceParams,
  ) {
    return this.meetingParticipantService.updateParticipantViewPreference(
      params,
    );
  }

  requestJoinApproval(params: MeetingJoinRequestParams) {
    return this.meetingAdmissionService.requestJoinApproval(params);
  }

  listJoinRequests(params: ListJoinRequestsParams) {
    return this.meetingAdmissionService.listJoinRequests(params);
  }

  approveJoinRequest(params: ResolveJoinRequestParams) {
    return this.meetingAdmissionService.approveJoinRequest(params);
  }

  declineJoinRequest(params: ResolveJoinRequestParams) {
    return this.meetingAdmissionService.declineJoinRequest(params);
  }

  approveAllJoinRequests(params: MeetingModeratorParams) {
    return this.meetingAdmissionService.approveAllJoinRequests(params);
  }

  declineAllJoinRequests(params: MeetingModeratorParams) {
    return this.meetingAdmissionService.declineAllJoinRequests(params);
  }
}
