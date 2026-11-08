import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DocumentActionsMenu } from "./document-actions-menu";
import { DocumentBulkAction as Action } from "../../types/document-bulk.types";
import {
  DocumentViewType,
  DocumentRole,
  DocumentItemType,
} from "../../types/documents.enums";
import type { DocumentItem } from "../../types/documents.types";

function descendants(
  node: React.ReactNode,
): React.ReactElement<{ children?: React.ReactNode }>[] {
  return React.Children.toArray(node).flatMap((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child)
      ? [child, ...descendants(child.props.children)]
      : [],
  );
}

test("the compact Actions menu starts the chosen action without opening a destination or confirmation", (context) => {
  const choose = context.mock.fn();
  const useState = React.useState;
  context.mock.method(React, "useState", ((initial: unknown) =>
    initial === false
      ? [true, () => {}]
      : useState(initial)) as typeof React.useState);
  let tree: React.ReactNode;
  function Harness() {
    tree = DocumentActionsMenu({
      items: [
        {
          id: "file",
          userRole: DocumentRole.OWNER,
          projectId: null,
          isArchived: false,
          type: DocumentItemType.FILE,
        } as DocumentItem,
      ],
      activeView: DocumentViewType.MY_FILES,
      disabled: false,
      hasMore: false,
      onChoose: choose,
    });

    return null;
  }
  renderToStaticMarkup(<Harness />);
  const items = descendants(tree).filter(
    (element) => element.type === DropdownMenuItem,
  ) as React.ReactElement<React.ComponentProps<typeof DropdownMenuItem>>[];
  const move = items.find((item) =>
    descendants(item).some(
      (child) => child.type === "span" && child.props.children === "Move",
    ),
  );
  assert.ok(move);
  assert.equal(choose.mock.callCount(), 0);
  move.props.onClick?.(
    {} as Parameters<NonNullable<typeof move.props.onClick>>[0],
  );
  assert.equal(choose.mock.callCount(), 1);
  assert.equal(choose.mock.calls[0].arguments[0], Action.MOVE);
});
