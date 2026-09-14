"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DialogContextValue {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function Dialog({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
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
  const { onOpenChange } = useDialogContext();
  return (
    <div
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-[100] bg-black/55 backdrop-blur-sm", className)}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange?.(false);
      }}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const { open, onOpenChange } = useDialogContext();

  React.useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange?.(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-[110] max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border bg-background text-foreground shadow-2xl",
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
            className="absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </DialogPortal>
  );
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
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-lg font-bold tracking-tight", className)}
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
};
