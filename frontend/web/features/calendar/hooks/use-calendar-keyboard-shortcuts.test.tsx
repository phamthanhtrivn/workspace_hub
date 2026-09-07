// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCalendarKeyboardShortcuts } from "./use-calendar-keyboard-shortcuts";

afterEach(cleanup);

function KeyboardHarness({
  onCreate,
  onToday,
  onViewChange,
}: {
  onCreate: () => void;
  onToday: () => void;
  onViewChange: (view: string) => void;
}) {
  useCalendarKeyboardShortcuts({ onCreate, onToday, onViewChange });
  return <input aria-label="Editable" />;
}

describe("useCalendarKeyboardShortcuts", () => {
  it("routes Calendar shortcuts to stable actions", () => {
    const onCreate = vi.fn();
    const onToday = vi.fn();
    const onViewChange = vi.fn();
    render(
      <KeyboardHarness
        onCreate={onCreate}
        onToday={onToday}
        onViewChange={onViewChange}
      />,
    );

    fireEvent.keyDown(window, { key: "c" });
    fireEvent.keyDown(window, { key: "t" });
    fireEvent.keyDown(window, { key: "w" });

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onToday).toHaveBeenCalledOnce();
    expect(onViewChange).toHaveBeenCalledWith("timeGridWeek");
  });

  it("does not trigger shortcuts while editing or using modifiers", () => {
    const onCreate = vi.fn();
    const onToday = vi.fn();
    const onViewChange = vi.fn();
    const { getByRole } = render(
      <KeyboardHarness
        onCreate={onCreate}
        onToday={onToday}
        onViewChange={onViewChange}
      />,
    );

    fireEvent.keyDown(getByRole("textbox", { name: "Editable" }), { key: "c" });
    fireEvent.keyDown(window, { key: "t", ctrlKey: true });
    fireEvent.keyDown(window, { key: "m", metaKey: true });

    expect(onCreate).not.toHaveBeenCalled();
    expect(onToday).not.toHaveBeenCalled();
    expect(onViewChange).not.toHaveBeenCalled();
  });
});
