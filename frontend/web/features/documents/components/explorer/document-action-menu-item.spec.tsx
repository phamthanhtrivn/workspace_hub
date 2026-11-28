import assert from "node:assert/strict";
import { test } from "node:test";
import { toast } from "sonner";
import { DocumentActionMenuItem } from "./document-action-menu-item";

test("denied menu actions stay enabled and show feedback only when clicked", (context) => {
  const feedback = context.mock.method(toast, "info", () => "toast");
  const action = context.mock.fn();
  const stopPropagation = context.mock.fn();
  const menuItem = DocumentActionMenuItem({
    blockedReason: "Owner required",
    onClick: action,
  });
  assert.equal(menuItem.props.disabled, undefined);
  assert.equal(menuItem.props.disabledReason, undefined);
  assert.equal(feedback.mock.callCount(), 0);
  menuItem.props.onClick?.({ stopPropagation } as Parameters<
    NonNullable<typeof menuItem.props.onClick>
  >[0]);
  assert.equal(feedback.mock.calls[0].arguments[0], "Owner required");
  assert.equal(action.mock.callCount(), 0);
  assert.equal(stopPropagation.mock.callCount(), 1);
});

test("allowed menu actions run normally", (context) => {
  const action = context.mock.fn();
  const menuItem = DocumentActionMenuItem({ onClick: action });
  menuItem.props.onClick?.(
    {} as Parameters<NonNullable<typeof menuItem.props.onClick>>[0],
  );
  assert.equal(action.mock.callCount(), 1);
});
