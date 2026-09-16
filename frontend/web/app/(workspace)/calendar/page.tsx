import { Suspense } from "react";
import { CalendarWorkspace } from "@/features/calendar/components/workspace/calendar-workspace";

export default function CalendarPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={null}>
        <CalendarWorkspace />
      </Suspense>
    </div>
  );
}
