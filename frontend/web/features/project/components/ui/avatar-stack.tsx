"use client";

import { UserAvatar } from "@/components/common/user-avatar";
import { cn } from "@/lib/utils";
import { useProjectAvatar } from "../../hooks/use-project-avatar";

interface AvatarItem {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

const AVATAR_SIZES = { xs: "h-6 w-6 text-xs", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-xs" } as const;
const AVATAR_ICON_SIZES = { xs: "size-3.5", sm: "size-4", md: "size-5" } as const;
type AvatarSize = keyof typeof AVATAR_SIZES;

export function Avatar({
  user,
  size = "sm",
  className,
}: {
  user: AvatarItem;
  size?: AvatarSize;
  className?: string;
}) {
  const source = useProjectAvatar(user.userId, user.avatarUrl);
  const label = user.displayName.trim() || "User";

  return (
    <UserAvatar
      src={source}
      alt={label}
      title={label}
      iconClassName={AVATAR_ICON_SIZES[size]}
      className={cn(AVATAR_SIZES[size], "inline-grid shrink-0 place-items-center rounded-full bg-muted text-muted-foreground ring-2 ring-border", className)}
    />
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

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar key={user.userId} user={user} size={size} />
      ))}
      {remaining > 0 && (
        <span
          className={`${AVATAR_SIZES[size]} inline-grid shrink-0 place-items-center rounded-full bg-accent font-semibold text-muted-foreground ring-2 ring-border`}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
