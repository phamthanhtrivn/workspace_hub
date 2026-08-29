interface ParticipantRoleBadgeProps {
  label: string;
  tone: "host" | "cohost" | "self";
}

export function ParticipantRoleBadge({ label, tone }: ParticipantRoleBadgeProps) {
  const className =
    tone === "host"
      ? "bg-amber-400/15 text-amber-200"
      : tone === "cohost"
        ? "bg-blue-400/15 text-blue-200"
        : "bg-emerald-400/15 text-emerald-200";

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${className}`}>
      {label}
    </span>
  );
}
