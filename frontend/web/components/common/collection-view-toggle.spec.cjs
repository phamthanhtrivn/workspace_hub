const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { createSourceLoader } = require("../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../.."));

test("shared collection view buttons expose selection and report the chosen view", () => {
  const { CollectionViewToggle } = load("components/common/collection-view-toggle.tsx");
  const changes = [];
  const tree = CollectionViewToggle({ value: "grid", onChange: (view) => changes.push(view), ariaLabel: "Document view" });
  const buttons = tree.props.children;
  assert.deepEqual(buttons.map((button) => button.props["aria-pressed"]), [true, false]);
  buttons[1].props.onClick();
  assert.deepEqual(changes, ["list"]);
  const html = renderToStaticMarkup(React.createElement(CollectionViewToggle, { value: "list", onChange() {}, ariaLabel: "Notebook view" }));
  assert.match(html, /role="group" aria-label="Notebook view"/);
  assert.match(html, /type="button" aria-label="List view"[^>]*aria-pressed="true"/);
});
