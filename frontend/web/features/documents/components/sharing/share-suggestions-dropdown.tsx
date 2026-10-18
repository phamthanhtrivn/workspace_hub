"use client";

import React from "react";
import { User } from "lucide-react";
import Image from "next/image";
import { ComboboxContent, ComboboxList, ComboboxItem } from "@/components/ui/combobox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserSearchResponse } from "@/features/chat/types/chat.types";

import { USER_FALLBACK_NAME } from "../../types/documents.constants";

interface ShareSuggestionsDropdownProps {
  show: boolean;
  results: UserSearchResponse[];
  onSelect: (user: UserSearchResponse) => void;
}

export const ShareSuggestionsDropdown = React.memo(
  function ShareSuggestionsDropdown({
    show,
    results,
    onSelect,
  }: ShareSuggestionsDropdownProps) {
    if (!show || results.length === 0) return null;

    return (
      <ComboboxContent className="max-h-[248px] bg-card py-1">
        <ComboboxList className="divide-y divide-border">
        {results.map((user) => (
          <ComboboxItem
            key={user.id}
            value={user}
            onClick={() => onSelect(user)}
            className="flex items-center gap-3 px-4 py-2 hover:bg-background cursor-pointer transition-colors"
          >
            <Avatar className="relative w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.fullName || "avatar"}
                  fill
                  sizes="40px"
                  className="object-cover rounded-full"
                />
              ) : (
                <AvatarFallback><User size={14} className="text-muted-foreground" /></AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-foreground truncate">
                {user.fullName || USER_FALLBACK_NAME}
              </p>
              <p className="text-xs text-muted-foreground truncate font-semibold">
                {user.email}
              </p>
            </div>
          </ComboboxItem>
        ))}
        </ComboboxList>
      </ComboboxContent>
    );
  },
);
