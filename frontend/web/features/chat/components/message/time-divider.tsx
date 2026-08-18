import { formatDividerTime } from "@/lib/date";

interface TimeDividerProps {
  date: string | Date;
}

export default function TimeDivider({ date }: TimeDividerProps) {
  return (
    <div className="my-5 flex w-full items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="shrink-0 text-xs font-semibold text-slate-500">
        {formatDividerTime(date)}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
