import { MeetingSocketRoomPrefix } from '../types/meeting.enums';

export const getMeetingParticipantRoom = (meetingId: string) =>
  `${MeetingSocketRoomPrefix.PARTICIPANTS}:${meetingId}`;

export const getMeetingModeratorRoom = (meetingId: string) =>
  `${MeetingSocketRoomPrefix.MODERATORS}:${meetingId}`;

export const getMeetingHostRoom = (meetingId: string) =>
  getMeetingModeratorRoom(meetingId);

export const getMeetingUserRoom = (meetingId: string, userId: string) =>
  `${MeetingSocketRoomPrefix.USER}:${meetingId}:${userId}`;

export const getMeetingRealtimeRooms = (meetingId: string, userId: string) => [
  getMeetingParticipantRoom(meetingId),
  getMeetingModeratorRoom(meetingId),
  getMeetingUserRoom(meetingId, userId),
];
