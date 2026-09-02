"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { useJoinMeetingRoom } from "../../hooks/useJoinMeetingRoom";
import {
  getAudioSetting,
  getVideoSetting,
} from "../../utils/meeting-room.utils";
import { MeetingRoomContent } from "./meeting-room-content";
import { MeetingRoomError, MeetingRoomLoading } from "./meeting-room-state";

interface MeetingRoomShellProps {
  joinToken: string;
}

export function MeetingRoomShell({ joinToken }: MeetingRoomShellProps) {
  const router = useRouter();
  const { room, settings, isLoading, isError } = useJoinMeetingRoom(joinToken);

  if (isLoading) {
    return <MeetingRoomLoading joinToken={joinToken} />;
  }

  if (isError || !room) {
    return <MeetingRoomError onBack={() => router.push("/meetings")} />;
  }

  return (
    <LiveKitRoom
      serverUrl={room.livekit.serverUrl}
      token={room.livekit.token}
      connect
      audio={getAudioSetting(settings)}
      video={getVideoSetting(settings)}
      onDisconnected={() => router.push("/meetings")}
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
