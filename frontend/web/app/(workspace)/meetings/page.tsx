import { createPageMetadata } from "@/lib/seo";
import { MeetingLayout } from "@/features/meeting/components/meeting-layout";

export const metadata = createPageMetadata("/meetings");

export default function MeetingsPage() {
  return <MeetingLayout />;
}
