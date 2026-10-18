import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";


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
    <Button variant="unstyled"
      type="button"
      onClick={onClick}
      className={`mt-3 flex w-full cursor-pointer items-center justify-between rounded-control bg-info-soft px-3 py-2 text-sm font-medium text-info-content transition hover:bg-info-soft ${className}`}
    >
      <span className="truncate">{children}</span>
      <ChevronRight size={15} className="shrink-0" />
    </Button>
  );
}
