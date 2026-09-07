import { MeetingRoomShell } from "@/features/meeting/components/room/meeting-room-shell";

export default async function MeetingRoomPage({
  params,
}: {
  params: Promise<{ joinToken: string }>;
}) {
  const { joinToken } = await params;

  return <MeetingRoomShell joinToken={joinToken} />;
}
