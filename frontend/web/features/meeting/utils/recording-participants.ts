import { ParticipantKind } from "livekit-client";
import { isCaptionWorker } from "./meeting-captions";

export function isRecordingParticipant(participant: {
  identity: string;
  isLocal?: boolean;
  kind?: ParticipantKind;
  permissions?: { hidden?: boolean };
}) {
  return (
    !participant.isLocal &&
    !participant.permissions?.hidden &&
    participant.kind !== ParticipantKind.EGRESS &&
    !isCaptionWorker(participant.identity)
  );
}
