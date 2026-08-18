import { ChevronRight } from "lucide-react";

interface SeeAllButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function SeeAllButton({
  children,
  onClick,
  className = "",
}: SeeAllButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-3 flex w-full cursor-pointer items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-100 ${className}`}
    >
      <span className="truncate">{children}</span>
      <ChevronRight size={15} className="shrink-0" />
    </button>
  );
}
