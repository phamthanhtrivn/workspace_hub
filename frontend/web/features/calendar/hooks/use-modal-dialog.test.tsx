// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useModalDialog } from "./use-modal-dialog";

afterEach(cleanup);

function DialogHarness({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef, onClose });

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true">
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  );
}

function NestedDialogHarness({
  onInnerClose,
  onOuterClose,
}: {
  onInnerClose: () => void;
  onOuterClose: () => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef: outerRef, onClose: onOuterClose });
  useModalDialog({ dialogRef: innerRef, onClose: onInnerClose });

  return (
    <div ref={outerRef} role="dialog" aria-modal="true">
      <button type="button">Outer</button>
      <div ref={innerRef} role="dialog" aria-modal="true">
        <button type="button">Inner</button>
      </div>
    </div>
  );
}

function NoDocumentLockDialogHarness({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef, onClose, lockDocumentScroll: false });

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true">
      <button type="button">First</button>
    </div>
  );
}

function InnerDialog({ onClose }: { onClose: () => void }) {
  const innerRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef: innerRef, onClose });

  return (
    <div ref={innerRef} role="dialog" aria-modal="true">
      <button type="button">Inner</button>
    </div>
  );
}

function ControlledNestedDialogHarness({
  showInner,
  onInnerClose,
  onOuterClose,
}: {
  showInner: boolean;
  onInnerClose: () => void;
  onOuterClose: () => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef: outerRef, onClose: onOuterClose });

  return (
    <div ref={outerRef} role="dialog" aria-modal="true">
      <button type="button">Outer</button>
      {showInner && <InnerDialog onClose={onInnerClose} />}
    </div>
  );
}

describe("useModalDialog", () => {
  it("focuses the first control and closes on Escape", () => {
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps Tab focus inside the dialog", () => {
    render(<DialogHarness onClose={vi.fn()} />);
    const first = screen.getByRole("button", { name: "First" });
    const last = screen.getByRole("button", { name: "Last" });

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("lets only the topmost dialog handle Escape", () => {
    const onInnerClose = vi.fn();
    const onOuterClose = vi.fn();
    render(
      <NestedDialogHarness
        onInnerClose={onInnerClose}
        onOuterClose={onOuterClose}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onInnerClose).toHaveBeenCalledOnce();
    expect(onOuterClose).not.toHaveBeenCalled();
  });

  it("locks background scroll until the last dialog closes", () => {
    const { rerender, unmount } = render(
      <ControlledNestedDialogHarness
        showInner
        onInnerClose={vi.fn()}
        onOuterClose={vi.fn()}
      />,
    );

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    rerender(
      <ControlledNestedDialogHarness
        showInner={false}
        onInnerClose={vi.fn()}
        onOuterClose={vi.fn()}
      />,
    );

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("can skip document scroll locking", () => {
    const { unmount } = render(
      <NoDocumentLockDialogHarness onClose={vi.fn()} />,
    );

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");

    unmount();

    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });
});
