"use client";

import { X } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { IconButton } from "@/components/ui/icon-button";

interface SelectedUserChipProps {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  disabled?: boolean;
  onRemove: () => void;
}

export function SelectedUserChip({
  name,
  email,
  avatarUrl,
  disabled,
  onRemove,
}: SelectedUserChipProps) {
  const label = email && email !== name ? `${name} (${email})` : name;

  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-info-soft py-1 pl-1.5 pr-1 text-xs font-medium text-info-content">
      <UserAvatar src={avatarUrl} alt={name} width={24} height={24} />
      <span className="min-w-0 truncate" title={label}>
        {label}
      </span>
      <IconButton
        label={`Remove ${name}`}
        showTooltip={false}
        size="icon-sm"
        disabled={disabled}
        onClick={onRemove}
        className="size-7 shrink-0 text-info-content hover:bg-info-soft hover:text-info-content"
      >
        <X aria-hidden="true" className="size-3.5" />
      </IconButton>
    </div>
  );
}
