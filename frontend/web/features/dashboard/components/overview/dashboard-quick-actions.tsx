import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ICON_COLORS } from "../../constants/dashboard-appearance";

export function DashboardQuickActions({ onCreateTask, disabled }: { onCreateTask: () => void; disabled: boolean }) {
  return (
    <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto">
      <Button type="button" onClick={onCreateTask} disabled={disabled} className="min-h-11 w-full sm:w-auto">
        <Plus aria-hidden size={16} />
        Create task
      </Button>
      <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
        <Link href="/calendar">
          <CalendarDays aria-hidden size={16} className={DASHBOARD_ICON_COLORS.calendar} />
          Open calendar
        </Link>
      </Button>
    </div>
  );
}
