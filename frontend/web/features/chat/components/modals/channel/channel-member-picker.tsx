"use client";

import { useRef, useState } from "react";
import { User } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSpaceMemberCandidates } from "../../../api/space.api";
import {
  chatKeys,
  SPACE_MEMBER_SEARCH_DEBOUNCE_MS,
} from "../../../types/chat.constant";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";

interface ChannelMemberPickerProps {
  spaceId: string;
  selected: string[];
  channelId?: string;
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

export default function ChannelMemberPicker({
  spaceId,
  selected,
  channelId,
  onChange,
  disabled,
}: ChannelMemberPickerProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebouncedValue(
    search.trim(),
    SPACE_MEMBER_SEARCH_DEBOUNCE_MS,
  );
  const isSearching = search.trim() !== debouncedSearch;
  const { data, isPending, isFetching, isPlaceholderData, isError, refetch } =
    useQuery({
      queryKey: chatKeys.spaceMemberCandidates(
        spaceId,
        channelId,
        debouncedSearch,
        page,
      ),
      queryFn: async ({ signal }) =>
        (
          await getSpaceMemberCandidates(
            spaceId,
            { page, search: debouncedSearch, channelId },
            signal,
          )
        ).data,
      enabled: Boolean(spaceId) && !isSearching,
      placeholderData: keepPreviousData,
    });
  const candidates = data?.members ?? [];
  const pagination = data?.pagination;
  const isLoading = isPending || isSearching || isPlaceholderData;
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  return (
    <div className="min-w-0 space-y-2">
      <Input
        aria-label="Search space members"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          changePage(1);
        }}
        maxLength={100}
        placeholder="Search space members"
        disabled={disabled}
      />
      <div
        ref={listRef}
        aria-busy={isLoading || isFetching}
        className="max-h-[min(12rem,35dvh)] min-w-0 overflow-y-auto overscroll-contain rounded-control border border-border p-2"
      >
        {isLoading ? (
          <p role="status" className="p-2 text-sm text-muted-foreground">
            Loading members...
          </p>
        ) : isError ? (
          <div className="p-2">
            <p role="alert" className="text-sm text-destructive-content">
              Could not load space members.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : candidates.length ? (
          candidates.map((member) => (
            <label
              key={member.userId}
              className="flex min-w-0 cursor-pointer items-center gap-3 rounded-control p-2 hover:bg-muted"
            >
              <Checkbox
                className="size-4 shrink-0 accent-primary"
                disabled={disabled || isFetching}
                checked={selected.includes(member.userId)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, member.userId]
                      : selected.filter((id) => id !== member.userId),
                  )
                }
              />
              <Avatar
                aria-hidden="true"
                className="size-9 border border-border bg-muted"
              >
                <AvatarImage
                  src={member.profile?.avatarUrl || undefined}
                  alt=""
                />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User size={18} />
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block truncate font-medium">
                  {member.profile?.fullName ||
                    member.profile?.email ||
                    member.userId}
                </span>
                {member.profile?.fullName && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.profile.email}
                  </span>
                )}
              </span>
            </label>
          ))
        ) : (
          <p className="p-2 text-sm text-muted-foreground">
            No available members found.
          </p>
        )}
      </div>
      {!isSearching && !isError && pagination && pagination.total > 0 && (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p role="status" className="min-w-0 text-xs text-muted-foreground">
            {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            of {pagination.total} members
          </p>
          <SimplePagination
            compact
            page={pagination.page}
            totalPages={pagination.totalPages}
            isLoading={disabled || isFetching}
            onPageChange={changePage}
            ariaLabel="Channel member pages"
            className="shrink-0"
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {selected.length} selected. Only members of this space can be added.
      </p>
    </div>
  );
}
