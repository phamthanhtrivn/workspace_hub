import { formatDividerTime } from "@/lib/date";

interface TimeDividerProps {
  date: string | Date;
}

export default function TimeDivider({ date }: TimeDividerProps) {
  return (
    <div className="flex justify-center my-4 w-full">
      <span className="text-xs text-gray-500 bg-gray-100/80 px-3 py-1 rounded-full text-center shadow-md backdrop-blur-sm">
        {formatDividerTime(date)}
      </span>
    </div>
  );
}
