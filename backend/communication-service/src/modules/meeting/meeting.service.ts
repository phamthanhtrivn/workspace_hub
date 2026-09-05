import { Injectable } from '@nestjs/common';
import { MeetingAdmissionService } from './services/meeting-admission.service';
import { MeetingParticipantService } from './services/meeting-participant.service';
import { MeetingRoomService } from './services/meeting-room.service';
import type {
  CreateInstantMeetingParams,
  GetMeetingAccessParams,
  JoinMeetingParams,
  ListJoinRequestsParams,
  ListMeetingParticipantsParams,
  MeetingJoinRequestParams,
  MeetingModeratorParams,
  ResolveJoinRequestParams,
  TargetMeetingParticipantParams,
  UpdateMeetingParticipantRoleParams,
  UpdateMeetingSettingsParams,
} from './types/meeting.types';

@Injectable()
export class MeetingService {
  constructor(
    private readonly meetingRoomService: MeetingRoomService,
    private readonly meetingParticipantService: MeetingParticipantService,
    private readonly meetingAdmissionService: MeetingAdmissionService,
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

  updateMeetingSettings(params: UpdateMeetingSettingsParams) {
    return this.meetingRoomService.updateMeetingSettings(params);
  }

  listMeetingParticipants(params: ListMeetingParticipantsParams) {
    return this.meetingParticipantService.listMeetingParticipants(params);
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
