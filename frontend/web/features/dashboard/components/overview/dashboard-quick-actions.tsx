import Link from "next/link";
import { CalendarDays, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardQuickActions() {
  return (
    <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
      <Button asChild variant="outline" className="min-h-11 w-full sm:min-h-9 sm:w-auto [@media(pointer:coarse)]:min-h-11">
        <Link href="/calendar">
          <CalendarDays size={16} />
          Open calendar
        </Link>
      </Button>
      <Button asChild className="min-h-11 w-full sm:min-h-9 sm:w-auto [@media(pointer:coarse)]:min-h-11">
        <Link href="/pomodoro">
          <Timer size={16} />
          Open Pomodoro
        </Link>
      </Button>
    </div>
  );
}
