import { createPageMetadata } from "@/lib/seo";
import ProjectDetailScreen from "@/features/project/screens/project-detail-screen";

export const metadata = createPageMetadata("/projects/[id]");

export default function ProjectDetailPage() {
  return <ProjectDetailScreen />;
}
