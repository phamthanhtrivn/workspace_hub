import { ViewAllAction } from "@/components/common/view-all-action";
import { cn } from "@/lib/utils";

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
    <ViewAllAction
      label={children}
      appearance="row"
      onClick={onClick}
      className={cn("mt-3", className)}
    />
  );
}
