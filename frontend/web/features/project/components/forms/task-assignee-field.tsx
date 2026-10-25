"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { useAppSelector } from "@/store/store";
import { TASK_ASSIGNEE_LABELS } from "../../constants/task.constants";
import { useProjectMembers } from "../../hooks/use-projects";
import { Avatar } from "../ui/avatar-stack";

interface TaskAssigneeFieldProps {
  projectId: string;
  value: string;
  onChange: (userId: string) => void;
  disabled?: boolean;
}

export function TaskAssigneeField({
  projectId,
  value,
  onChange,
  disabled = false,
}: TaskAssigneeFieldProps) {
  const labelId = useId();
  const hintId = useId();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const { data: members = [], isPending, isError, refetch } = useProjectMembers(projectId);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedMember = members.find((member) => member.userId === value);
  const currentMember = members.find((member) => member.userId === currentUserId);
  const query = search.trim().toLocaleLowerCase();
  const filteredMembers = members.filter((member) =>
    member.displayName.toLocaleLowerCase().includes(query),
  );

  const selectMember = (userId: string) => {
    if (disabled) return;
    onChange(userId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <section className="min-w-0 border-t border-border pt-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span id={labelId} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <UserRound aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          {TASK_ASSIGNEE_LABELS.field}
        </span>
        {currentMember && !isError && (
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={disabled || value === currentMember.userId}
            onClick={() => selectMember(currentMember.userId)}
            className="h-auto px-0 py-1 text-xs"
          >
            {TASK_ASSIGNEE_LABELS.assignToMe}
          </Button>
        )}
      </div>
      <Popover open={isOpen && !disabled} onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={TASK_ASSIGNEE_LABELS.select}
            aria-describedby={hintId}
            className="h-11 w-full justify-start gap-2.5 bg-background px-3 text-sm"
          >
            {selectedMember ? <Avatar user={selectedMember} size="xs" /> : <UserRound aria-hidden="true" className="text-muted-foreground" />}
            <span className="min-w-0 flex-1 truncate text-left">
              {selectedMember?.displayName || (value ? TASK_ASSIGNEE_LABELS.unavailable : TASK_ASSIGNEE_LABELS.unassigned)}
            </span>
            <ChevronDown aria-hidden="true" className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-labelledby={labelId}
          className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
        >
          <div className="border-b border-border p-2">
            <SearchInput
              autoFocus
              aria-label={TASK_ASSIGNEE_LABELS.search}
              placeholder={TASK_ASSIGNEE_LABELS.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
              disabled={disabled}
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            <Button type="button" variant="ghost" disabled={disabled} aria-pressed={!value}
              onClick={() => selectMember("")}
              className="h-auto min-h-10 w-full justify-start gap-2.5 px-2 text-sm">
              <UserRound aria-hidden="true" className="text-muted-foreground" />
              <span className="flex-1 text-left">{TASK_ASSIGNEE_LABELS.unassigned}</span>
              {!value && <Check aria-hidden="true" />}
            </Button>
            {isPending ? (
              <p role="status" className="px-3 py-3 text-xs text-muted-foreground">{TASK_ASSIGNEE_LABELS.loading}</p>
            ) : isError ? (
              <div className="px-3 py-3">
                <p role="alert" className="text-xs text-destructive-content">{TASK_ASSIGNEE_LABELS.loadError}</p>
                <Button type="button" variant="link" size="sm" disabled={disabled} onClick={() => void refetch()} className="mt-1 px-0">
                  {TASK_ASSIGNEE_LABELS.retry}
                </Button>
              </div>
            ) : filteredMembers.length === 0 ? (
              <p role="status" className="px-3 py-3 text-xs text-muted-foreground">{TASK_ASSIGNEE_LABELS.empty}</p>
            ) : filteredMembers.map((member) => (
              <Button key={member.userId} type="button" variant="ghost" disabled={disabled}
                aria-pressed={value === member.userId}
                onClick={() => selectMember(member.userId)}
                className="h-auto min-h-10 w-full justify-start gap-2.5 px-2 text-sm">
                <Avatar user={member} size="xs" />
                <span className="min-w-0 flex-1 truncate text-left">{member.displayName}</span>
                {value === member.userId && <Check aria-hidden="true" />}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <p id={hintId} className="mt-1 text-xs text-muted-foreground">{TASK_ASSIGNEE_LABELS.hint}</p>
    </section>
  );
}
