"use client";

import { useState } from "react";
import { UserAvatar } from "@/components/common/user-avatar";
import { SelectedUserChip } from "@/components/common/selected-user-chip";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import type { DirectCopyRecipient } from "../../types/document-copy.types";
import { DOCUMENT_COPY_MESSAGES } from "../../types/document-copy.constants";
import { matchesCopySearch } from "../../utils/document-copy-recipients";

interface DirectCopyPickerProps {
  recipients: DirectCopyRecipient[];
  selected: DirectCopyRecipient[];
  locked: boolean;
  onToggle: (conversationId: string) => void;
}

export function DirectCopyPicker({
  recipients,
  selected,
  locked,
  onToggle,
}: DirectCopyPickerProps) {
  const [search, setSearch] = useState("");
  const matches = recipients.filter((recipient) =>
    matchesCopySearch(
      search,
      recipient.name,
      recipient.email,
      recipient.nickname,
    ),
  );

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {DOCUMENT_COPY_MESSAGES.dmHelp}
      </p>
      {!!selected.length && (
        <div
          aria-label="Selected DM recipients"
          className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-panel border border-border bg-background p-2"
        >
          {selected.map((recipient) => (
            <SelectedUserChip
              key={recipient.conversationId}
              name={recipient.name}
              email={recipient.email}
              avatarUrl={recipient.avatarUrl}
              disabled={locked}
              onRemove={() => onToggle(recipient.conversationId)}
            />
          ))}
        </div>
      )}
      <SearchInput
        aria-label="Search existing DMs"
        placeholder="Search name, email or nickname..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch("")}
      />
      <div
        aria-label="Existing direct messages"
        className="max-h-64 min-h-32 space-y-1 overflow-y-auto rounded-panel border border-border p-1"
      >
        {matches.map((recipient) => {
          const checked = selected.some(
            (current) => current.conversationId === recipient.conversationId,
          );

          return (
            <label
              key={recipient.conversationId}
              className={cn(
                "flex min-h-16 cursor-pointer items-center gap-3 rounded-control px-3 py-2 transition-colors hover:bg-accent",
                checked && "bg-info-soft/50",
                locked && "cursor-default",
              )}
            >
              <UserAvatar
                src={recipient.avatarUrl}
                alt={recipient.name}
                width={36}
                height={36}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {recipient.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {recipient.email || recipient.nickname}
                </span>
              </span>
              <Checkbox
                aria-label={`Select ${recipient.name}`}
                checked={checked}
                disabled={locked}
                onCheckedChange={() => onToggle(recipient.conversationId)}
              />
            </label>
          );
        })}
        {!matches.length && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {recipients.length
              ? DOCUMENT_COPY_MESSAGES.dmNoMatches
              : DOCUMENT_COPY_MESSAGES.dmEmpty}
          </p>
        )}
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {selected.length} selected
      </p>
    </div>
  );
}
