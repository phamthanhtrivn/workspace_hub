import { createPageMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { CalendarWorkspace } from "@/features/calendar/components/workspace/calendar-workspace";

export const metadata = createPageMetadata("/calendar");

export default function CalendarPage() {
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col">
      <Suspense fallback={null}>
        <CalendarWorkspace />
      </Suspense>
    </div>
  );
}
