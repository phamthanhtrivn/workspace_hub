"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import * as Primitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

interface AnchoredPopupProps extends React.ComponentProps<"div"> {
  onClose: () => void;
  side?: "top" | "bottom";
  align?: "start" | "end";
  sideOffset?: number;
  alignOffset?: number;
  anchorRect?: DOMRect | null;
  anchorElementRef?: React.RefObject<HTMLElement | null>;
}

function usePopupAnchor(anchorRect?: DOMRect | null, anchorElementRef?: React.RefObject<HTMLElement | null>) {
  const marker = React.useRef<HTMLSpanElement>(null);
  const anchor = React.useMemo(() => ({ getBoundingClientRect: () => anchorRect ?? anchorElementRef?.current?.getBoundingClientRect() ?? marker.current?.parentElement?.getBoundingClientRect() ?? new DOMRect() }), [anchorRect, anchorElementRef]);
  const opener = React.useRef(typeof document !== "undefined" && document.activeElement instanceof HTMLElement ? document.activeElement : null);
  return { marker, anchor, opener };
}

/** For controlled feature menus whose trigger/state already belongs to a row or
 * toolbar. Positioning, roving focus, dismissal and portal ownership stay here. */
export function AnchoredMenu({ onClose, side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, anchorRect, anchorElementRef, className, ref, ...props }: AnchoredPopupProps) {
  const { marker, anchor, opener } = usePopupAnchor(anchorRect, anchorElementRef);
  return <><span hidden ref={marker} /><Menu.Root open modal={false} onOpenChange={(open, details) => {
    if (open) return;
    const target = details.event.target;
    if (/^(pointer|mouse|click)/.test(details.event.type) && target instanceof Node && (anchorElementRef?.current ?? marker.current?.parentElement)?.contains(target)) { details.cancel(); return; }
    onClose();
  }}><Menu.Portal><Menu.Positioner anchor={anchor} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} className="z-[120] max-w-[calc(100vw-1rem)]">
    <Menu.Popup ref={ref} finalFocus={() => {
      const active = document.activeElement;
      if (active instanceof Element && active.closest('[aria-modal="true"]')) return false;
      return opener.current?.isConnected ? opener.current : false;
    }} data-slot="dropdown-menu-content" className={cn("max-h-[var(--available-height)] overflow-y-auto outline-none", className)} {...props} />
  </Menu.Positioner></Menu.Portal></Menu.Root></>;
}

/** For search, labels and form popovers that must leave focus in their input. */
export function AnchoredPopover({ onClose, side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, anchorRect, anchorElementRef, className, ref, ...props }: AnchoredPopupProps) {
  const { marker, anchor, opener } = usePopupAnchor(anchorRect, anchorElementRef);
  const interactedOutside = React.useRef(false);
  const virtualRef = React.useMemo(() => ({ current: anchor }), [anchor]);
  return <><span hidden ref={marker} /><Primitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Primitive.Anchor virtualRef={virtualRef} />
    <Primitive.Portal><Primitive.Content ref={ref} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} data-slot="popover-content"
      onCloseAutoFocus={(event) => {
        if (interactedOutside.current || !opener.current?.isConnected) return;
        const modals = document.querySelectorAll('[aria-modal="true"]');
        const modal = modals[modals.length - 1];
        if (modal && !modal.contains(opener.current)) { event.preventDefault(); return; }
        event.preventDefault();
        opener.current.focus({ preventScroll: true });
      }}
      onInteractOutside={(event) => {
        if (event.target instanceof Node && (anchorElementRef?.current ?? marker.current?.parentElement)?.contains(event.target)) event.preventDefault();
        else interactedOutside.current = true;
      }}
      className={cn("z-[120] max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-1rem)] overflow-y-auto outline-none", className)} {...props} />
    </Primitive.Portal>
  </Primitive.Root></>;
}
