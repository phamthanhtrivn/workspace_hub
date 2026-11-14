"use client";

import { useState } from "react";
import { Check, Mail, Plus } from "lucide-react";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Spinner } from "@/components/ui/spinner";
import { useAttendeeSearch } from "@/features/calendar/hooks/use-calendar-users";
import type { UserSearchResponse } from "@/features/chat/types/chat.types";
import { MeetingButton } from "../ui/meeting-form-controls";
import { RecordingAccessPerson } from "./recording-access-person";
import { RecordingPermissionSelect } from "./recording-permission-select";

interface RecordingShareFormProps {
  ownerId: string;
  sharedUserIds: ReadonlySet<string>;
  disabled: boolean;
  granting: boolean;
  canDownload: boolean;
  onPermissionChange: (value: boolean) => void;
  onGrant: (userId: string) => Promise<void>;
}

export function RecordingShareForm({
  ownerId,
  sharedUserIds,
  disabled,
  granting,
  canDownload,
  onPermissionChange,
  onGrant,
}: RecordingShareFormProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserSearchResponse | null>(null);
  const [open, setOpen] = useState(false);
  const users = useAttendeeSearch(search);
  const results = (users.data ?? []).filter((user) => user.id !== ownerId);
  const alreadyShared = Boolean(selected && sharedUserIds.has(selected.id));

  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || !selected || alreadyShared) return;
        try {
          await onGrant(selected.id);
          setSearch("");
          setSelected(null);
          setOpen(false);
        } catch {
          /* The mutation displays the API error; retain the selection for retry. */
        }
      }}
    >
      <label
        htmlFor="recording-share-search"
        className="block text-xs font-semibold text-muted-foreground"
      >
        Share with others
      </label>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-44">
          <Combobox<UserSearchResponse>
            items={results}
            filter={null}
            value={selected}
            onValueChange={(user) => {
              if (!user) {
                setSelected(null);

                return;
              }
              if (disabled || user.id === ownerId || sharedUserIds.has(user.id))
                return;
              setSelected(user);
              setSearch(user.email);
              setOpen(false);
            }}
            inputValue={search}
            onInputValueChange={(value, details) => {
              setSearch(value);
              if (
                details.reason === "input-change" ||
                details.reason === "input-clear"
              ) {
                setSelected(null);
                setOpen(Boolean(value.trim()));
              }
            }}
            itemToStringLabel={(user) => user?.email ?? ""}
            open={open && Boolean(search.trim())}
            onOpenChange={setOpen}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted-foreground"
            >
              {users.isFetching ? <Spinner /> : <Mail className="size-4" />}
            </span>
            <ComboboxInput
              id="recording-share-search"
              placeholder="Name or email address"
              disabled={disabled}
              onFocus={() => setOpen(Boolean(search.trim()))}
              className="h-10 pl-9"
            />
            <ComboboxContent className="max-h-60">
              <ComboboxList>
                {results.map((user) => (
                  <ComboboxItem
                    key={user.id}
                    value={user}
                    disabled={sharedUserIds.has(user.id)}
                  >
                    <RecordingAccessPerson
                      name={user.fullName || user.email}
                      email={user.email}
                      avatarUrl={user.avatarUrl}
                    />
                    {sharedUserIds.has(user.id) && (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Check className="size-3.5" aria-hidden="true" />
                        Has access
                      </span>
                    )}
                  </ComboboxItem>
                ))}
                {!results.length && (
                  <p
                    className="px-3 py-3 text-sm text-muted-foreground"
                    role={users.isError ? "alert" : "status"}
                  >
                    {users.isFetching
                      ? "Searching…"
                      : users.isError
                        ? "Could not search accounts. Try again."
                        : "No accounts found."}
                  </p>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
        <RecordingPermissionSelect
          canDownload={canDownload}
          onChange={onPermissionChange}
          label="Permission for recording shares"
          disabled={disabled}
        />
        <MeetingButton
          type="submit"
          className="size-10 p-0"
          aria-label="Grant recording access"
          title="Grant access"
          loading={granting}
          disabled={disabled || !selected || alreadyShared}
        >
          <Plus className="size-4" aria-hidden="true" />
        </MeetingButton>
      </div>
    </form>
  );
}
