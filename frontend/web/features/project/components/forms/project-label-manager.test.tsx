// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectLabelManager } from "./project-label-manager";

vi.mock("@/features/i18n/useAppIntl", () => ({
  useAppIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id,
  }),
}));

afterEach(cleanup);

describe("ProjectLabelManager", () => {
  it("offers eight preset colors without opening the native color picker", () => {
    const { container } = render(<ProjectLabelManager />);

    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(container.querySelector('input[type="color"]')).toBeNull();
    expect(screen.getAllByRole("radio")[0].getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("creates a label with the selected preset color", async () => {
    const onCreateLabel = vi.fn(async () => undefined);
    render(<ProjectLabelManager onCreateLabel={onCreateLabel} />);

    fireEvent.change(
      screen.getByPlaceholderText("project.label.namePlaceholder"),
      { target: { value: "Khẩn cấp" } },
    );
    fireEvent.click(screen.getAllByRole("radio")[3]);
    fireEvent.click(screen.getByRole("button", { name: "app.add" }));

    await waitFor(() =>
      expect(onCreateLabel).toHaveBeenCalledWith({
        name: "Khẩn cấp",
        color: "#EF4444",
      }),
    );
  });
});
