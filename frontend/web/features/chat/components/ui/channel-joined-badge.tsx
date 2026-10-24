import { Check } from "lucide-react";

export default function ChannelJoinedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-success-soft px-3 py-1.5 text-xs font-semibold text-success-content">
      <Check size={14} aria-hidden="true" />
      Joined
    </span>
  );
}
