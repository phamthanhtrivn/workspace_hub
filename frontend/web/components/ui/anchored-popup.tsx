"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import * as Primitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { POPUP_LAYER_CLASS } from "./popup-layer";

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

/** Controlled compatibility popups still expose their relationship to the
 * existing trigger. Explicit feature-provided ARIA attributes take precedence. */
const managedExpandedTriggers = new WeakSet<HTMLElement>();
function usePopupTrigger(id: string, kind: "menu" | "dialog", marker: React.RefObject<HTMLSpanElement | null>, opener: React.RefObject<HTMLElement | null>, anchorElementRef?: React.RefObject<HTMLElement | null>, virtual = false) {
  React.useEffect(() => {
    if (virtual) return; // A pointer context menu has no persistent trigger.
    const boundary = anchorElementRef?.current ?? marker.current?.parentElement;
    const candidate = opener.current;
    if (!candidate || !boundary?.contains(candidate) || !candidate.matches('button,[role="button"]')) return;
    const added: string[] = [];
    for (const [name, value] of [["aria-haspopup", kind], ["aria-controls", id], ["aria-expanded", "true"]]) {
      if (!candidate.hasAttribute(name) || (name === "aria-expanded" && managedExpandedTriggers.has(candidate))) {
        candidate.setAttribute(name, value); added.push(name);
        if (name === "aria-expanded") managedExpandedTriggers.add(candidate);
      }
    }
    return () => {
      for (const name of added) {
        if (name === "aria-expanded") candidate.setAttribute(name, "false");
        else candidate.removeAttribute(name);
      }
    };
  }, [id, kind, marker, opener, anchorElementRef, virtual]);
}

/** For controlled feature menus whose trigger/state already belongs to a row or
 * toolbar. Positioning, roving focus, dismissal and portal ownership stay here. */
export function AnchoredMenu({ onClose, side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, anchorRect, anchorElementRef, className, ref, ...props }: AnchoredPopupProps) {
  const generatedId = React.useId();
  const popupId = props.id ?? generatedId;
  const { marker, anchor, opener } = usePopupAnchor(anchorRect, anchorElementRef);
  usePopupTrigger(popupId, "menu", marker, opener, anchorElementRef, Boolean(anchorRect));
  return <><span hidden ref={marker} /><Menu.Root open modal={false} onOpenChange={(open, details) => {
    if (open) return;
    const target = details.event.target;
    if (/^(pointer|mouse|click)/.test(details.event.type) && target instanceof Node && (anchorElementRef?.current ?? marker.current?.parentElement)?.contains(target)) { details.cancel(); return; }
    onClose();
  }}><Menu.Portal><Menu.Positioner anchor={anchor} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} className={cn(POPUP_LAYER_CLASS, "max-w-[calc(100vw-1rem)]")}>
    <Menu.Popup id={popupId} ref={ref} finalFocus={() => {
      const active = document.activeElement;
      if (active instanceof Element && active.closest('[aria-modal="true"]')) return false;
      return opener.current?.isConnected ? opener.current : false;
    }} data-slot="dropdown-menu-content" className={cn("max-h-[var(--available-height)] overflow-y-auto outline-none", className)} {...props} />
  </Menu.Positioner></Menu.Portal></Menu.Root></>;
}

/** For search, labels and form popovers that must leave focus in their input. */
export function AnchoredPopover({ onClose, side = "bottom", align = "start", sideOffset = 8, alignOffset = 0, anchorRect, anchorElementRef, className, ref, ...props }: AnchoredPopupProps) {
  const generatedId = React.useId();
  const popupId = props.id ?? generatedId;
  const { marker, anchor, opener } = usePopupAnchor(anchorRect, anchorElementRef);
  usePopupTrigger(popupId, "dialog", marker, opener, anchorElementRef, Boolean(anchorRect));
  const interactedOutside = React.useRef(false);
  const virtualRef = React.useMemo(() => ({ current: anchor }), [anchor]);
  return <><span hidden ref={marker} /><Primitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Primitive.Anchor virtualRef={virtualRef} />
    <Primitive.Portal><Primitive.Content id={popupId} ref={ref} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} data-slot="popover-content"
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
      className={cn("max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-1rem)] overflow-y-auto outline-none", className, POPUP_LAYER_CLASS)} {...props} />
    </Primitive.Portal>
  </Primitive.Root></>;
}
