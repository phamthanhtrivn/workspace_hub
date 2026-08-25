import { MeetingJoinPage } from "@/features/meeting/components/meeting-join-page";

export default async function MeetingTokenPage({
  params,
}: {
  params: Promise<{ joinToken: string }>;
}) {
  const { joinToken } = await params;
  return <MeetingJoinPage joinToken={joinToken} />;
}
