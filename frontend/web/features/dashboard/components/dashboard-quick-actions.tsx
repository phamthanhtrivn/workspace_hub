import Link from "next/link";
import { CalendarDays, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link href="/calendar">
          <CalendarDays size={16} />
          Open calendar
        </Link>
      </Button>
      <Button asChild>
        <Link href="/pomodoro">
          <Timer size={16} />
          Open Pomodoro
        </Link>
      </Button>
    </div>
  );
}
