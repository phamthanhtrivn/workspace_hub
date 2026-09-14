import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MeetingLoadingState({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)} aria-label={label}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
