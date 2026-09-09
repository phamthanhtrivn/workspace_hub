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
import { MeetingWaitingApproval } from "./meeting-waiting-approval";
import { MeetingWaitingHost } from "./meeting-waiting-host";

interface MeetingRoomShellProps {
  joinToken: string;
}

export function MeetingRoomShell({ joinToken }: MeetingRoomShellProps) {
  const {
    flowStep,
    room,
    access,
    isStartingScheduledMeeting,
    waitingStatus,
    settings,
    preJoinProps,
    goBackToMeetings,
  } =
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
    case MeetingJoinFlowStep.WAITING_HOST:
      return access ? (
        <MeetingWaitingHost
          access={access}
          isStarting={isStartingScheduledMeeting}
          onBack={goBackToMeetings}
          onStart={preJoinProps.onStart}
        />
      ) : (
        <MeetingRoomError onBack={goBackToMeetings} />
      );
    case MeetingJoinFlowStep.WAITING_APPROVAL:
      return (
        <MeetingWaitingApproval
          status={waitingStatus}
          onBack={goBackToMeetings}
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
            meetingId={room.meeting.id}
            joinToken={room.meeting.joinToken}
            participantRole={room.meeting.participantRole}
            initialAutoAdmit={room.meeting.autoAdmit}
            initialChatEnabled={room.meeting.chatEnabled}
            initialScreenShareEnabled={room.meeting.screenShareEnabled}
            initialActiveScreenShareUserId={
              room.meeting.activeScreenShareUserId
            }
            initialScreenShareStartedAt={room.meeting.screenShareStartedAt}
            initialChatMuted={room.meeting.chatMuted}
            settings={settings}
          />
        </LiveKitRoom>
      );
  }
}
