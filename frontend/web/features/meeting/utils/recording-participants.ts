import { ParticipantKind } from "livekit-client";

export function isRecordingParticipant(participant: {
  identity: string;
  isLocal?: boolean;
  kind?: ParticipantKind;
  permissions?: { hidden?: boolean };
}) {
  return (
    !participant.isLocal &&
    !participant.permissions?.hidden &&
    participant.kind !== ParticipantKind.EGRESS
  );
}
