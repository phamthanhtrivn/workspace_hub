import { createPageMetadata } from "@/lib/seo";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata = createPageMetadata("/dashboard");

export default function DashboardPage() {
  return <DashboardView />;
}
