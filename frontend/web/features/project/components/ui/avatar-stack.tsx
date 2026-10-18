"use client";

import { Avatar as SharedAvatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface AvatarItem {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

const PALETTE = [
  "bg-primary text-primary-foreground",
  "bg-destructive text-destructive-foreground",
  "bg-warning text-warning-foreground",
  "bg-success text-success-foreground",
  "bg-primary text-primary-foreground",
  "bg-primary text-primary-foreground",
  "bg-primary text-primary-foreground",
  "bg-success text-success-foreground",
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

  return (
    <SharedAvatar
      title={user.displayName}
      className={`${sizeClasses[size]} ${colorForUser(user.userId)} inline-grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-border`}
    >
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.displayName} render={<Image src={user.avatarUrl} alt={user.displayName} width={40} height={40} unoptimized />} />}
      <AvatarFallback className={colorForUser(user.userId)}>{getInitials(user.displayName)}</AvatarFallback>
    </SharedAvatar>
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
