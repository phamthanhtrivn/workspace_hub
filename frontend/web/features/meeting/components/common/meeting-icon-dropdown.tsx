"use client";
import { useId as useControlledPopupId } from "react";

import { useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";


export interface MeetingIconDropdownItem {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

interface MeetingIconDropdownProps {
  label: string;
  items: MeetingIconDropdownItem[];
}

export function MeetingIconDropdown({ label, items }: MeetingIconDropdownProps) {
  const controlledPopupId = useControlledPopupId();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasEnabledItems = items.some((item) => !item.disabled);



  if (items.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      <Button aria-controls={`${controlledPopupId}-isOpen`} aria-haspopup="menu" variant="unstyled"
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        disabled={!hasEnabledItems}
        onClick={() => setIsOpen((current) => !current)}
        className="grid h-8 w-8 cursor-pointer place-items-center rounded-control text-current transition hover:bg-overlay/15 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen ? (
        <AnchoredMenu id={`${controlledPopupId}-isOpen`} onClose={() => setIsOpen(false)} side="bottom" align="end" aria-label="Meeting actions" className="z-20 w-48 overflow-hidden rounded-lg bg-card py-1 text-card-foreground ring-1 ring-border/10 shadow-panel">
          {items.map((item) => (
            <DropdownMenuItem closeOnClick={false}
              key={item.id}

              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;

                item.onSelect();
                setIsOpen(false);
              }}
              className={`flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                item.danger
                  ? "text-destructive-content hover:bg-destructive hover:text-destructive-foreground"
                  : "text-muted-foreground hover:bg-overlay/10 hover:text-foreground"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="truncate">{item.label}</span>
            </DropdownMenuItem>
          ))}
        </AnchoredMenu>
      ) : null}
    </div>
  );
}
