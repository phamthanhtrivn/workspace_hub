"use client";

interface AvatarItem {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

const PALETTE = [
  "bg-primary",
  "bg-destructive",
  "bg-warning",
  "bg-success",
  "bg-primary",
  "bg-primary",
  "bg-primary",
  "bg-success",
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  user,
  size = "sm",
}: {
  user: AvatarItem;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-xs",
  };

  if (user.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt={user.displayName}
        title={user.displayName}
        width={40}
        height={40}
        unoptimized
        className={`${sizeClasses[size]} shrink-0 rounded-full object-cover ring-2 ring-border`}
      />
    );
  }

  return (
    <span
      title={user.displayName}
      className={`${sizeClasses[size]} ${colorForUser(user.userId)} inline-grid shrink-0 place-items-center rounded-full font-semibold text-primary-foreground ring-2 ring-border`}
    >
      {getInitials(user.displayName)}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = "sm",
}: {
  users: AvatarItem[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-xs",
  };

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar key={user.userId} user={user} size={size} />
      ))}
      {remaining > 0 && (
        <span
          className={`${sizeClasses[size]} inline-grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-muted-foreground ring-2 ring-border`}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
import Image from "next/image";
