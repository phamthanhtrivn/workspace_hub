"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, Hash, Lock, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { SearchInput } from "@/components/ui/search-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChannelVisibility } from "@/features/chat/types/chat.enums";
import type {
  SpaceChannel,
  SpaceResponse,
} from "@/features/chat/types/chat.types";
import { DOCUMENT_COPY_MESSAGES } from "../../types/document-copy.constants";
import { matchesCopySearch } from "../../utils/document-copy-recipients";
import { cn } from "@/lib/utils";

interface ChannelCopyPickerProps {
  spaces: SpaceResponse[];
  channels: SpaceChannel[];
  selectedSpaceId: string;
  selectedChannelId: string;
  locked: boolean;
  onSpaceChange: (id: string) => void;
  onChannelChange: (id: string) => void;
}

export function ChannelCopyPicker({
  spaces,
  channels,
  selectedSpaceId,
  selectedChannelId,
  locked,
  onSpaceChange,
  onChannelChange,
}: ChannelCopyPickerProps) {
  const [search, setSearch] = useState("");
  const radioName = useId();
  const matches = channels.filter((channel) =>
    matchesCopySearch(search, channel.name),
  );
  const selectedChannel = channels.find(
    (channel) => channel.id === selectedChannelId,
  );
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {DOCUMENT_COPY_MESSAGES.channelHelp}
      </p>
      <div className="space-y-1.5">
        <span className="text-xs font-semibold text-foreground">Space</span>
        <Combobox
          items={spaces}
          value={spaces.find((space) => space.id === selectedSpaceId) ?? null}
          onValueChange={(space) => {
            if (space) {
              onSpaceChange(space.id);
              setSearch("");
            }
          }}
          itemToStringLabel={(space) => space?.name ?? ""}
          isItemEqualToValue={(space, value) => space.id === value.id}
          disabled={locked}
        >
          <div className="relative">
            <ComboboxInput
              aria-label="Search spaces"
              placeholder="Search spaces..."
              className="pr-10"
            />
            <ComboboxTrigger
              aria-label="Show spaces"
              className="absolute right-0 top-0 grid size-9 cursor-pointer place-items-center text-muted-foreground"
            >
              <ChevronDown aria-hidden="true" className="size-4" />
            </ComboboxTrigger>
          </div>
          <ComboboxContent>
            <ComboboxEmpty className="p-3 text-sm text-muted-foreground">
              No matching spaces.
            </ComboboxEmpty>
            <ComboboxList>
              {(space: SpaceResponse) => (
                <ComboboxItem
                  key={space.id}
                  value={space}
                  className="justify-between"
                >
                  <span className="truncate">{space.name}</span>
                  <ComboboxItemIndicator>
                    <Check aria-hidden="true" className="size-4" />
                  </ComboboxItemIndicator>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
      {selectedChannel && (
        <div
          role="group"
          aria-label="Selected channel"
          className="flex min-w-0 items-center gap-2 rounded-control border border-border bg-info-soft py-1 pl-3 pr-1 text-xs text-info-content"
        >
          <Hash aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-semibold">
            {selectedSpace?.name} / #{selectedChannel.name}
          </span>
          <IconButton
            label="Clear selected channel"
            size="icon-sm"
            showTooltip={false}
            disabled={locked}
            onClick={() => onChannelChange("")}
            className="text-info-content hover:bg-info-soft"
          >
            <X aria-hidden="true" className="size-3.5" />
          </IconButton>
        </div>
      )}
      <SearchInput
        aria-label="Search channels"
        placeholder="Search channels in this space..."
        disabled={!selectedSpaceId}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch("")}
      />
      <RadioGroup
        aria-label="Choose one channel"
        name={radioName}
        value={selectedChannelId}
        onValueChange={onChannelChange}
        disabled={locked}
        className="max-h-56 auto-rows-max content-start gap-1 overflow-y-auto rounded-panel border border-border p-1"
      >
        {matches.map((channel) => {
          const Icon =
            channel.visibility === ChannelVisibility.PRIVATE ? Lock : Hash;

          return (
            <label
              key={channel.id}
              className={cn(
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-3 py-2 transition-colors hover:bg-accent",
                selectedChannelId === channel.id && "bg-info-soft/50",
                locked && "cursor-default",
              )}
            >
              <Icon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {channel.name}
              </span>
              <RadioGroupItem
                value={channel.id}
                aria-label={`Send to ${channel.name}`}
              />
            </label>
          );
        })}
        {!matches.length && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {!spaces.length
              ? DOCUMENT_COPY_MESSAGES.spaceEmpty
              : channels.length
                ? DOCUMENT_COPY_MESSAGES.channelNoMatches
                : DOCUMENT_COPY_MESSAGES.channelEmpty}
          </p>
        )}
      </RadioGroup>
    </div>
  );
}
