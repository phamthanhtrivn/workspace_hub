import { MeetingSocketRoomPrefix } from '../types/meeting.enums';

export const getMeetingHostRoom = (meetingId: string) =>
  `${MeetingSocketRoomPrefix.HOST}:${meetingId}`;

export const getMeetingUserRoom = (meetingId: string, userId: string) =>
  `${MeetingSocketRoomPrefix.USER}:${meetingId}:${userId}`;
