"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useModalDialog } from "./use-modal-dialog";

interface DialogContextValue {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  titleId: string;
  modalRole: "dialog" | "alertdialog";
  closeOnEscape: boolean;
  closeOnOutsideClick: boolean;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function Dialog({
  open = false,
  onOpenChange,
  children,
  modalRole = "dialog",
  closeOnEscape = true,
  closeOnOutsideClick = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  modalRole?: "dialog" | "alertdialog";
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}) {
  const titleId = React.useId();
  return (
    <DialogContext.Provider value={{ open, onOpenChange, titleId, modalRole, closeOnEscape, closeOnOutsideClick }}>
      {children}
    </DialogContext.Provider>
  );
}

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used inside Dialog");
  }
  return context;
}

function DialogTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  const { onOpenChange } = useDialogContext();
  if (
    asChild &&
    React.isValidElement<{ onClick?: React.MouseEventHandler<HTMLElement> }>(
      children,
    )
  ) {
    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        children.props.onClick?.(event);
        if (!event.defaultPrevented) onOpenChange?.(true);
      },
    });
  }

  return (
    <Button type="button" onClick={() => onOpenChange?.(true)}>
      {children}
    </Button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  const portalRoot = typeof document === "undefined" ? null : document.body;
  if (!portalRoot) return null;
  return createPortal(children, portalRoot);
}

function DialogOverlay({ className }: { className?: string }) {
  const { onOpenChange, closeOnOutsideClick } = useDialogContext();
  return (
    <div
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-[100] bg-overlay/55", className)}
      onMouseDown={(event) => {
        if (closeOnOutsideClick && event.target === event.currentTarget) onOpenChange?.(false);
      }}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  onFocusCapture,
  ref,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean; overlayClassName?: string }) {
  const { open, onOpenChange, titleId, modalRole, closeOnEscape } = useDialogContext();
  const contentRef = React.useRef<HTMLDivElement>(null);

  const { captureOpener } = useModalDialog({ dialogRef: contentRef, onClose: () => { if (closeOnEscape) onOpenChange?.(false); }, enabled: open });

  if (!open) return null;

  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        role={modalRole}
        aria-modal="true"
        aria-labelledby={props["aria-label"] ? undefined : titleId}
        tabIndex={-1}
        data-slot="dialog-content"
        onFocusCapture={(event) => {
          captureOpener(event);
          onFocusCapture?.(event);
        }}
        className={cn(
          "fixed left-1/2 top-1/2 z-[110] max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-dialog border bg-popover text-popover-foreground shadow-dialog",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange?.(false)}
            className="absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </DialogPortal>
  );
}

/** Composition adapter for existing layouts; the shared layer owns the portal
 * and modal lifecycle without imposing new visual styles on feature content. */
function DialogSurface({ children, onClose, open = true, ref, onFocusCapture, className, ...props }: React.ComponentProps<"div"> & { onClose: () => void; open?: boolean }) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const ariaLabel = props["aria-label"];
  const ariaLabelledBy = props["aria-labelledby"];
  const { captureOpener } = useModalDialog({ dialogRef: contentRef, onClose, enabled: open });
  React.useEffect(() => {
    const node = contentRef.current;
    if (!node || ariaLabel || ariaLabelledBy) return;
    const heading = node.querySelector<HTMLElement>("h1,h2,h3,h4,h5,h6,[data-dialog-title]");
    if (heading) {
      if (!heading.id) heading.id = titleId;
      node.setAttribute("aria-labelledby", heading.id);
    } else {
      node.setAttribute("aria-label", "Dialog");
    }
  }, [open, titleId, ariaLabel, ariaLabelledBy]);
  if (!open) return null;
  return <DialogPortal><div
    ref={(node) => { contentRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
    role="dialog" aria-modal="true" tabIndex={-1} data-slot="dialog-surface"
    className={cn("relative z-[110]", className)}
    onFocusCapture={(event) => { captureOpener(event); onFocusCapture?.(event); }}
    {...props}
  >{children}</div></DialogPortal>;
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("space-y-1.5 px-5 py-4", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex justify-end gap-2 border-t px-5 py-4", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = useDialogContext();
  return (
    <h2
      id={titleId}
      data-slot="dialog-title"
      className={cn("text-section-title font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  DialogSurface,
};
