import { UserAvatar } from "@/components/common/user-avatar";

export function RecordingAccessPerson({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
      <UserAvatar
        src={avatarUrl}
        alt={name}
        width={36}
        height={36}
        sizes="36px"
        className="ring-1 ring-border"
      />
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-foreground"
          title={name}
        >
          {name}
        </p>
        {email && email !== name && (
          <p className="truncate text-xs text-muted-foreground" title={email}>
            {email}
          </p>
        )}
      </div>
    </div>
  );
}
