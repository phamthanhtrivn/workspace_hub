import { createPageMetadata } from "@/lib/seo";
import ProjectInvitationsScreen from "@/features/project/screens/project-invitations-screen";

export const metadata = createPageMetadata("/projects/invitations");

export default async function Page({ searchParams }: { searchParams: Promise<{ invitationId?: string }> }) {
  const { invitationId } = await searchParams;
  return <ProjectInvitationsScreen invitationId={invitationId} />;
}
