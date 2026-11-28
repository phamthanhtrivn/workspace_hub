"use client";

import { useId, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import type { ProjectMember } from "../../types/project";
import { TASK_ASSIGNEE_LABELS } from "../../constants/task.constants";
import { Avatar } from "./avatar-stack";

const MAX_VISIBLE_ASSIGNEES = 4;

interface TaskAssigneeFilterProps {
  members: ProjectMember[];
  selectedAssigneeIds: string[];
  onToggleAssignee: (userId: string) => void;
}

export function TaskAssigneeFilter({
  members,
  selectedAssigneeIds,
  onToggleAssignee,
}: TaskAssigneeFilterProps) {
  const labelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const visibleMembers = members.slice(0, MAX_VISIBLE_ASSIGNEES);
  const remainingCount = Math.max(0, members.length - visibleMembers.length);
  const hiddenSelectedCount = members
    .slice(MAX_VISIBLE_ASSIGNEES)
    .filter((member) => selectedAssigneeIds.includes(member.userId)).length;
  const query = search.trim().toLocaleLowerCase();
  const filteredMembers = members.filter((member) =>
    member.displayName.toLocaleLowerCase().includes(query),
  );

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex shrink-0 items-center gap-1"
    >
      <span
        id={labelId}
        className="mr-1 text-xs font-semibold text-muted-foreground"
      >
        {TASK_ASSIGNEE_LABELS.field}:
      </span>
      <div className="flex items-center -space-x-1.5">
        {visibleMembers.map((member) => {
          const isSelected = selectedAssigneeIds.includes(member.userId);

          return (
            <Button
              key={member.userId}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onToggleAssignee(member.userId)}
              aria-label={`Filter tasks assigned to ${member.displayName}`}
              aria-pressed={isSelected}
              title={member.displayName}
              className={[
                "relative size-6 rounded-full p-0 transition-transform hover:z-10 focus-visible:z-20",
                isSelected ? "z-10 scale-110" : "",
              ].join(" ")}
            >
              <Avatar
                user={member}
                size="xs"
                className={isSelected ? "ring-primary" : undefined}
              />
            </Button>
          );
        })}
        {remainingCount > 0 && (
          <Popover
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) setSearch("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Show all ${members.length} project members${hiddenSelectedCount ? `, ${hiddenSelectedCount} additional assignees selected` : ""}`}
                title={`Show all project members${hiddenSelectedCount ? ` (${hiddenSelectedCount} more selected)` : ""}`}
                className={[
                  "relative h-6 w-auto min-w-6 rounded-full bg-accent px-1.5 text-xs text-muted-foreground ring-2 hover:z-10 focus-visible:z-20",
                  hiddenSelectedCount
                    ? "z-10 ring-primary text-info-content"
                    : "ring-border",
                ].join(" ")}
              >
                +{remainingCount}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              aria-label="Filter tasks by assignee"
              className="w-64 max-w-[calc(100vw-2rem)] overflow-hidden p-0"
            >
              <div className="border-b border-border p-2">
                <SearchInput
                  autoFocus
                  aria-label={TASK_ASSIGNEE_LABELS.search}
                  placeholder={TASK_ASSIGNEE_LABELS.searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onClear={() => setSearch("")}
                />
              </div>
              <div className="max-h-56 overflow-y-auto p-1">
                {filteredMembers.length === 0 ? (
                  <p
                    role="status"
                    className="px-3 py-3 text-xs text-muted-foreground"
                  >
                    {TASK_ASSIGNEE_LABELS.empty}
                  </p>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = selectedAssigneeIds.includes(
                      member.userId,
                    );

                    return (
                      <Button
                        key={member.userId}
                        type="button"
                        variant="ghost"
                        aria-pressed={isSelected}
                        onClick={() => onToggleAssignee(member.userId)}
                        className="h-auto min-h-10 w-full justify-start gap-2.5 px-2 text-sm"
                      >
                        <Avatar user={member} size="xs" />
                        <span
                          className="min-w-0 flex-1 truncate text-left"
                          title={member.displayName}
                        >
                          {member.displayName}
                        </span>
                        {isSelected && (
                          <Check
                            aria-hidden="true"
                            className="text-info-content"
                          />
                        )}
                      </Button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
