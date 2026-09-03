"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useMeetingRoomJoinFlow } from "../../hooks/useMeetingRoomJoinFlow";
import {
  MeetingJoinFlowStep,
  MeetingPreJoinMode,
} from "../../types/meeting.types";
import {
  getAudioSetting,
  getVideoSetting,
} from "../../utils/meeting-room.utils";
import { MeetingPreJoin } from "./meeting-prejoin";
import { MeetingRoomContent } from "./meeting-room-content";
import { MeetingRoomError, MeetingRoomLoading } from "./meeting-room-state";

interface MeetingRoomShellProps {
  joinToken: string;
}

export function MeetingRoomShell({ joinToken }: MeetingRoomShellProps) {
  const { flowStep, room, settings, preJoinProps, goBackToMeetings } =
    useMeetingRoomJoinFlow(joinToken);

  switch (flowStep) {
    case MeetingJoinFlowStep.CHECKING:
    case MeetingJoinFlowStep.JOINING:
      return <MeetingRoomLoading joinToken={joinToken} />;
    case MeetingJoinFlowStep.PREJOIN:
      return (
        <MeetingPreJoin
          mode={MeetingPreJoinMode.JOIN}
          {...preJoinProps}
        />
      );
    case MeetingJoinFlowStep.ERROR:
      return <MeetingRoomError onBack={goBackToMeetings} />;
    case MeetingJoinFlowStep.ROOM:
      if (!room) return <MeetingRoomError onBack={goBackToMeetings} />;
      return (
        <LiveKitRoom
          serverUrl={room.livekit.serverUrl}
          token={room.livekit.token}
          connect
          audio={getAudioSetting(settings)}
          video={getVideoSetting(settings)}
          onDisconnected={goBackToMeetings}
          onMediaDeviceFailure={() => undefined}
          className="contents"
        >
          <MeetingRoomContent
            joinToken={room.meeting.joinToken}
            participantRole={room.meeting.participantRole}
            settings={settings}
          />
        </LiveKitRoom>
      );
  }
}
