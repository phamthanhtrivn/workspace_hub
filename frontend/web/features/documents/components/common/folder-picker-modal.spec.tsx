import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureStore } from "@reduxjs/toolkit";
import { toast } from "sonner";
import { store } from "@/store/store";
import { Button } from "@/components/ui/button";
import { FolderPickerModal } from "./folder-picker-modal";
import { DocumentItemType, DocumentRole } from "../../types/documents.enums";
import { DOCUMENT_BULK_MESSAGES as M } from "../../types/document-bulk.types";

function descendants(
  node: React.ReactNode,
): React.ReactElement<{ children?: React.ReactNode }>[] {
  return React.Children.toArray(node).flatMap((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child)
      ? [child, ...descendants(child.props.children)]
      : [],
  );
}

test("Move destinations stay visible and reject forbidden clicks with feedback", (context) => {
  const feedback = context.mock.method(toast, "info", () => "toast");
  const selected = context.mock.fn();
  const project = {
    id: "project-root",
    name: "GatherTown",
    type: DocumentItemType.FOLDER,
    projectId: "project",
    userRole: DocumentRole.OWNER,
    isArchived: false,
  };
  const client = new QueryClient();
  context.after(() => client.clear());
  const testStore = configureStore({
    reducer: () => ({
      ...store.getState(),
      auth: { ...store.getState().auth, userId: null },
    }),
  });
  client.setQueryData(["folder-picker", null, "readonly", undefined, null], {
    data: [project],
  });
  client.setQueryData(["folder-picker-access", null, "readonly"], {
    ...project,
    id: "readonly",
    projectId: null,
    userRole: DocumentRole.VIEWER,
  });
  let tree: React.ReactNode;
  function Harness() {
    const content = FolderPickerModal({
      open: true,
      movingItemId: "file",
      initialFolderId: "readonly",
      onClose() {},
      onSelectFolder: selected,
    })!;
    const Content = content.type as (
      props: typeof content.props,
    ) => React.ReactElement;
    tree = Content(content.props);

    return null;
  }
  renderToStaticMarkup(
    <Provider store={testStore}>
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>
    </Provider>,
  );
  const buttons = descendants(tree).filter(
    (element) => element.type === Button,
  ) as React.ReactElement<React.ComponentProps<typeof Button>>[];
  const folder = buttons.find((button) =>
    descendants(button).some((child) => child.props.children === "GatherTown"),
  );
  assert.ok(folder);
  assert.equal(folder.props.disabled, false);
  assert.doesNotMatch(folder.props.className ?? "", /opacity-40/);
  assert.equal(feedback.mock.callCount(), 0);
  folder.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  assert.equal(feedback.mock.calls[0].arguments[0], M.PROJECT_DESTINATION);
  const confirm = buttons.find(
    (button) => button.props.children === "Move here",
  );
  assert.ok(confirm);
  assert.equal(confirm.props.disabled, false);
  confirm.props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  assert.equal(feedback.mock.calls[1].arguments[0], M.EDITOR);
  assert.equal(selected.mock.callCount(), 0);
});
