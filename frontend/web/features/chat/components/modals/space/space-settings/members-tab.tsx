import Image from "next/image";

import { IconButton } from "@/components/ui/icon-button";
import { Search, Crown, Trash2, User, Shield, ShieldOff } from "lucide-react";
import { FaKey } from "react-icons/fa";
import {
  SpaceMemberListItem,
  SpaceRole,
} from "@/features/chat/types/chat.types";
import { getSpaceMemberName } from "@/features/chat/types/space-settings/space-settings.types";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";


interface MembersTabProps {
  currentUserId: string | null;
  currentUserRole?: SpaceRole | null;
  isLoading: boolean;
  isMutating: boolean;
  allowRoleUpdates?: boolean;
  members: SpaceMemberListItem[];
  readOnly?: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onTransferOwnership?: (member: SpaceMemberListItem) => void;
  onRemove: (member: SpaceMemberListItem) => void;
  onUpdateRole?: (member: SpaceMemberListItem, role: SpaceRole) => void;
  spaceCreatorId?: string | null;
}

export function MembersTab({
  currentUserId,
  currentUserRole,
  isLoading,
  isMutating,
  allowRoleUpdates,
  members,
  readOnly,
  search,
  onSearchChange,
  onTransferOwnership,
  onRemove,
  onUpdateRole,
  spaceCreatorId,
}: MembersTabProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input aria-label="Search members" unstyled
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search members..."
          className="w-full rounded-control border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-info-outline focus:bg-card"
        />
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <LoadingState label="Loading members..." layout="centered" className="py-8 text-center text-xs text-muted-foreground" />
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No members found
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.userId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              disabled={isMutating}
              member={member}
              onTransferOwnership={readOnly ? undefined : onTransferOwnership}
              onRemove={readOnly ? undefined : onRemove}
              onUpdateRole={
                readOnly && !allowRoleUpdates ? undefined : onUpdateRole
              }
              spaceCreatorId={spaceCreatorId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MemberRow({
  currentUserId,
  currentUserRole,
  disabled,
  member,
  onTransferOwnership,
  onRemove,
  onUpdateRole,
  spaceCreatorId,
}: {
  currentUserId: string | null;
  currentUserRole?: SpaceRole | null;
  disabled: boolean;
  member: SpaceMemberListItem;
  onTransferOwnership?: (member: SpaceMemberListItem) => void;
  onRemove?: (member: SpaceMemberListItem) => void;
  onUpdateRole?: (member: SpaceMemberListItem, role: SpaceRole) => void;
  spaceCreatorId?: string | null;
}) {
  const name = getSpaceMemberName(member);
  const isMe = member.userId === currentUserId;
  const isCreator = member.userId === spaceCreatorId;
  const isCurrentUserCreator = currentUserId === spaceCreatorId;
  const canCurrentUserRemove =
    !isCreator &&
    (isCurrentUserCreator ||
      (currentUserRole === SpaceRole.ADMIN &&
        member.role === SpaceRole.MEMBER));
  const canCurrentUserUpdateRole =
    isCurrentUserCreator && !isCreator && Boolean(onUpdateRole);

  return (
    <div className="flex items-center justify-between rounded-panel px-3 py-2 hover:bg-background">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-9 w-9 shrink-0">
          <div className="h-full w-full overflow-hidden rounded-full bg-muted flex items-center justify-center">
            {member.profile?.avatarUrl ? (
              <Image
                src={member.profile.avatarUrl}
                alt={name}
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} className="text-muted-foreground" />
            )}
          </div>
          {isCreator ? (
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-warning border border-border text-warning-foreground"
              title="Owner"
            >
              <FaKey size={8} />
            </span>
          ) : member.role === SpaceRole.ADMIN ? (
            <span
              className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground"
              title="Admin"
            >
              <FaKey size={8} />
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {isMe ? "You" : name}
            </p>
            {isCreator ? (
              <span className="shrink-0 rounded-md border border-border bg-warning-soft px-1.5 py-0.5 text-xs font-semibold text-warning-content">
                Owner
              </span>
            ) : member.role === SpaceRole.ADMIN ? (
              <span className="shrink-0 rounded-md border border-border bg-info-soft px-1.5 py-0.5 text-xs font-semibold text-info-content">
                Admin
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {member.profile?.email || member.userId}
          </p>
        </div>
      </div>

      {!isMe && (
        <div className="flex shrink-0 items-center gap-1">
          {canCurrentUserUpdateRole && (
            <>
              {member.role === SpaceRole.MEMBER && (
                <IconButton label="Promote to Admin" showTooltip={false} size="icon-sm"
                  type="button"
                  title="Promote to Admin"
                  disabled={disabled}
                  onClick={() => onUpdateRole?.(member, SpaceRole.ADMIN)}
                  className="p-2 rounded-control text-muted-foreground hover:text-info-content hover:bg-info-soft disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Shield size={16} />
                </IconButton>
              )}
              {member.role === SpaceRole.ADMIN && (
                <IconButton label="Demote to Member" showTooltip={false} size="icon-sm"
                  type="button"
                  title="Demote to Member"
                  disabled={disabled}
                  onClick={() => onUpdateRole?.(member, SpaceRole.MEMBER)}
                  className="p-2 rounded-control text-muted-foreground hover:text-muted-foreground hover:bg-background disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <ShieldOff size={16} />
                </IconButton>
              )}
            </>
          )}
          {isCurrentUserCreator && !isCreator && onTransferOwnership && (
            <>
              <IconButton label="Transfer Ownership" showTooltip={false} size="icon-sm"
                type="button"
                title="Transfer Ownership"
                disabled={disabled}
                onClick={() => onTransferOwnership?.(member)}
                className="p-2 rounded-control text-muted-foreground hover:text-warning-content hover:bg-warning-soft disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Crown size={16} className="fill-warning-content text-warning-content" />
              </IconButton>
            </>
          )}
          {canCurrentUserRemove && onRemove && (
            <IconButton label="Remove from Space" showTooltip={false} size="icon-sm"
              type="button"
              title="Remove from Space"
              disabled={disabled}
              onClick={() => onRemove(member)}
              className="p-2 rounded-control text-muted-foreground hover:text-destructive-content hover:bg-destructive-soft disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Trash2 size={16} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

