"use client";

interface AvatarItem {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

const PALETTE = [
  "bg-indigo-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
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
    xs: "h-6 w-6 text-[9px]",
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
  };

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        title={user.displayName}
        className={`${sizeClasses[size]} shrink-0 rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <span
      title={user.displayName}
      className={`${sizeClasses[size]} ${colorForUser(user.userId)} inline-grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-white`}
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
    xs: "h-6 w-6 text-[9px]",
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
  };

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar key={user.userId} user={user} size={size} />
      ))}
      {remaining > 0 && (
        <span
          className={`${sizeClasses[size]} inline-grid shrink-0 place-items-center rounded-full bg-slate-200 font-bold text-slate-600 ring-2 ring-white`}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
