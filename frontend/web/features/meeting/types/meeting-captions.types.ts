export const CAPTION_TOPIC = "wh.meeting.captions";
export interface MeetingCaption {
  speakerId: string;
  speakerName: string;
  trackId: string;
  text: string;
  final: boolean;
  sequence: number;
  receivedAt: number;
}
export interface CaptionSession {
  workerIdentity: string;
  language: string;
}
