import ProjectsScreen from "@/features/project/screens/projects-screen";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata("/projects");

export default function ProjectsPage() {
  return <ProjectsScreen />;
}
