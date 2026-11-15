/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");
const load = createSourceLoader(path.resolve(__dirname, "../../.."));

function fixture(context) {
  const state = [],
    refs = [],
    listeners = new Map(),
    cleanup = [];
  let stateIndex = 0,
    refIndex = 0,
    clicks = 0;
  const previousWindow = globalThis.window;
  globalThis.window = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const { SourceUploadDropzone } = load(
    "features/ai/components/source-upload-dropzone.tsx",
    {
      react: {
        ...React,
        useId: () => "dropzone",
        useRef: (value) => (refs[refIndex++] ??= { current: value }),
        useState: (value) => {
          const key = stateIndex++;
          if (!(key in state)) state[key] = value;

          return [
            state[key],
            (update) => {
              state[key] = update;
            },
          ];
        },
        useEffect: (effect) => {
          if (!cleanup.length) cleanup.push(effect());
        },
      },
    },
  );
  context.after(() => {
    cleanup.forEach((dispose) => dispose?.());
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });

  return {
    listeners,
    clicks: () => clicks,
    render(props) {
      stateIndex = 0;
      refIndex = 0;
      const tree = SourceUploadDropzone({
        disabled: false,
        stage: null,
        ...props,
      });
      refs[0].current = {
        click: () => {
          clicks++;
        },
      };

      return tree;
    },
  };
}
function drag(items = []) {
  return {
    prevented: false,
    stopped: false,
    dataTransfer: { types: ["Files"], items, files: [] },
    preventDefault() {
      this.prevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    },
  };
}
test("dropping files rejects folders without traversing them and only uploads once", (context) => {
  const f = fixture(context),
    calls = [];
  const file = new File(["ok"], "note.txt");
  const tree = f.render({
    onFiles: async (...args) => {
      calls.push(args);
    },
  });
  const event = drag([
    {
      kind: "file",
      webkitGetAsEntry: () => ({ isDirectory: true, name: "Folder" }),
      getAsFile: () => {
        throw Error("Must not read folder");
      },
    },
    { kind: "file", getAsFile: () => file },
  ]);
  tree.props.onDragEnter(event);
  assert.match(
    f.render({ onFiles: async () => {} }).props.children[0].props.className,
    /border-primary/,
  );
  tree.props.onDrop(event);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.deepEqual(calls[0][0], [file]);
  assert.match(calls[0][1][0].message, /folders are not supported/);
  assert.equal(calls.length, 1);
});
test("the frame uses one keyboard-accessible button and blocks dropped/selected files when disabled", (context) => {
  const f = fixture(context),
    calls = [];
  const onFiles = async (files) => {
    calls.push(files);
  };
  let tree = f.render({ onFiles });
  const [button, input] = tree.props.children;
  assert.equal(button.props.type, "button");
  button.props.onClick();
  assert.equal(f.clicks(), 1);
  input.props.onChange({
    target: { files: [new File(["ok"], "note.txt")], value: "selected" },
  });
  assert.equal(calls.length, 1);
  tree = f.render({ onFiles, disabled: true });
  const event = drag();
  event.dataTransfer.files = [new File(["ok"], "blocked.txt")];
  tree.props.onDrop(event);
  tree.props.children[1].props.onChange({
    target: { files: event.dataTransfer.files, value: "selected" },
  });
  assert.equal(tree.props.children[0].props.disabled, true);
  assert.equal(calls.length, 1);
  assert.equal(event.prevented, true);
});
