const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../../.."));

function elements(tree, predicate) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree))
    return tree.flatMap((child) => elements(child, predicate));
  return [
    ...(predicate(tree) ? [tree] : []),
    ...elements(tree.props?.children, predicate),
  ];
}

function fixture() {
  let cursor = 0;
  const state = [],
    selected = [];
  const { TimezoneSelect } = load(
    "features/user-setting/components/ui/timezone-select.tsx",
    {
      react: {
        ...React,
        useId: () => "timezone",
        useMemo: (callback) => callback(),
        useEffect() {},
        useRef: () => ({ current: null }),
        useState(initial) {
          const index = cursor++;
          if (!(index in state)) state[index] = initial;
          return [
            state[index],
            (next) => {
              state[index] =
                typeof next === "function" ? next(state[index]) : next;
            },
          ];
        },
      },
      "@/components/ui/button": { Button: "button" },
      "@/components/ui/input": { Input: "input" },
      "@/components/ui/popover": {
        Popover: "popover",
        PopoverTrigger: "trigger",
        PopoverContent: "panel",
      },
    },
  );
  const render = () => {
    cursor = 0;
    return TimezoneSelect({
      value: "Asia/Ho_Chi_Minh",
      onChange: (value) => selected.push(value),
      options: [
        { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (UTC+07:00)" },
        { value: "UTC", label: "UTC (UTC+00:00)" },
        { value: "America/New_York", label: "America/New_York (UTC-05:00)" },
      ],
    });
  };
  return { render, selected };
}

test("timezone dropdown searches inside its panel and keyboard selection updates only the draft", () => {
  const { render, selected } = fixture();
  let tree = render();
  elements(tree, (node) => node.type === "popover")[0].props.onOpenChange(true);
  tree = render();
  const search = elements(tree, (node) => node.props?.role === "combobox")[0];
  assert.equal(search.props["aria-label"], "Search timezones");
  search.props.onChange({ target: { value: "new york" } });
  tree = render();
  const options = elements(tree, (node) => node.props?.role === "option");
  assert.equal(options.length, 1);
  assert.match(options[0].props.children[0].props.children, /New_York/);
  elements(tree, (node) => node.props?.role === "combobox")[0].props.onKeyDown({
    key: "Enter",
    preventDefault() {},
    stopPropagation() {},
  });
  assert.deepEqual(selected, ["America/New_York"]);
  assert.equal(
    elements(render(), (node) => node.type === "popover")[0].props.open,
    false,
  );
});

test("empty timezone searches show recovery text and Enter cannot select a hidden result", () => {
  const { render, selected } = fixture();
  elements(
    render(),
    (node) => node.props?.role === "combobox",
  )[0].props.onChange({ target: { value: "does-not-exist" } });
  const tree = render();
  assert.equal(
    elements(tree, (node) => node.props?.role === "option").length,
    0,
  );
  assert.ok(elements(tree, (node) => node.props?.role === "status").length);
  elements(tree, (node) => node.props?.role === "combobox")[0].props.onKeyDown({
    key: "Enter",
    preventDefault() {},
    stopPropagation() {},
  });
  assert.deepEqual(selected, []);
});
