import ProjectInvitationsScreen from "@/features/project/screens/project-invitations-screen";

export default async function Page({ searchParams }: { searchParams: Promise<{ invitationId?: string }> }) {
  const { invitationId } = await searchParams;
  return <ProjectInvitationsScreen invitationId={invitationId} />;
}
