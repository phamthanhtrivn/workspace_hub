import Image from "next/image";
import { Search, Shield, ShieldOff, Trash2, User } from "lucide-react";
import {
  ConversationRoles,
  SpaceMemberListItem,
} from "../../../types/chat.types";
import { SPACE_SETTINGS_LABELS } from "../../../types/space-settings.constants";
import { getSpaceMemberName } from "../../../types/space-settings.types";

interface MembersTabProps {
  currentUserId: string | null;
  isLoading: boolean;
  isMutating: boolean;
  members: SpaceMemberListItem[];
  search: string;
  onSearchChange: (search: string) => void;
  onRoleUpdate: (member: SpaceMemberListItem) => void;
  onRemove: (member: SpaceMemberListItem) => void;
}

export function MembersTab({
  currentUserId,
  isLoading,
  isMutating,
  members,
  search,
  onSearchChange,
  onRoleUpdate,
  onRemove,
}: MembersTabProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search members..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {SPACE_SETTINGS_LABELS.loadingMembers}
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {SPACE_SETTINGS_LABELS.noMembers}
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.userId}
              currentUserId={currentUserId}
              disabled={isMutating}
              member={member}
              onRoleUpdate={onRoleUpdate}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MemberRow({
  currentUserId,
  disabled,
  member,
  onRoleUpdate,
  onRemove,
}: {
  currentUserId: string | null;
  disabled: boolean;
  member: SpaceMemberListItem;
  onRoleUpdate: (member: SpaceMemberListItem) => void;
  onRemove: (member: SpaceMemberListItem) => void;
}) {
  const name = getSpaceMemberName(member);
  const isMe = member.userId === currentUserId;

  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-slate-50">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center">
          {member.profile?.avatarUrl ? (
            <Image
              src={member.profile.avatarUrl}
              alt={name}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            <User size={16} className="text-slate-400" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-800">
              {isMe ? "You" : name}
            </p>
            {member.role === ConversationRoles.ADMIN && (
              <span className="shrink-0 rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                Admin
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-400">
            {member.profile?.email || member.userId}
          </p>
        </div>
      </div>

      {!isMe && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title={
              member.role === ConversationRoles.ADMIN
                ? "Demote to Member"
                : "Promote to Admin"
            }
            disabled={disabled}
            onClick={() => onRoleUpdate(member)}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
          >
            {member.role === ConversationRoles.ADMIN ? (
              <ShieldOff size={16} />
            ) : (
              <Shield size={16} />
            )}
          </button>
          <button
            type="button"
            title="Remove from space"
            disabled={disabled}
            onClick={() => onRemove(member)}
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
