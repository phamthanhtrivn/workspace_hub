/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS regression harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const {
  createSourceLoader,
} = require("../../../../../tests/support/typescript.cjs");

function walk(node, predicate) {
  if (!node || typeof node !== "object") return undefined;
  if (Array.isArray(node))
    return node.map((entry) => walk(entry, predicate)).find(Boolean);
  if (predicate(node)) return node;

  return walk(node.props?.children, predicate);
}

function fixture() {
  const state = [],
    refs = [];
  let index = 0,
    refIndex = 0,
    signedOut = 0,
    closed = 0,
    signingOut = false;
  const load = createSourceLoader(path.resolve(__dirname, "../../.."));
  const Empty = () => null;
  const { default: UserSettingsModal } = load(
    "features/user-setting/components/user-settings-modal.tsx",
    {
      react: {
        ...React,
        useCallback: (fn) => fn,
        useRef: (value) => (refs[refIndex++] ??= { current: value }),
        useState: (initial) => {
          const position = index++;
          if (!(position in state))
            state[position] =
              typeof initial === "function" ? initial() : initial;

          return [
            state[position],
            (value) => {
              state[position] =
                typeof value === "function" ? value(state[position]) : value;
            },
          ];
        },
      },
      "@/features/auth/hooks/use-sign-out": {
        useSignOut: () => ({
          signOut: () => signedOut++,
          isSigningOut: signingOut,
        }),
      },
      "@/components/ui/use-media-query": { useMediaQuery: () => true },
      "@/store/store": { useAppSelector: () => "account-a" },
      "../hooks/useUserSettingQueries": {
        useUserProfileQuery: () => ({ data: { data: { hasPassword: true } } }),
      },
      "../hooks/use-settings-draft": {
        SettingsDraftContext: { Provider: "provider" },
      },
      "./profile-tab": { default: Empty },
      "./settings-tab": { default: Empty },
      "./sessions-tab": { default: Empty },
      "./password-tab": { default: Empty },
      "./pomodoro-tab": { default: Empty },
    },
  );
  const render = () => {
    index = 0;
    refIndex = 0;
    const wrapper = UserSettingsModal({
      isOpen: true,
      onClose: () => closed++,
    });

    return wrapper.type(wrapper.props);
  };
  const button = (tree, label) =>
    walk(
      tree,
      (node) =>
        node.props?.["aria-label"] === label || node.props?.children === label,
    );

  return {
    render,
    button,
    signedOut: () => signedOut,
    closed: () => closed,
    setSigningOut: (value) => {
      signingOut = value;
    },
  };
}

test("Settings signs out immediately when clean and disables the action during sign-out", () => {
  const f = fixture();
  f.button(f.render(), "Sign out").props.onClick();
  assert.equal(f.signedOut(), 1);
  f.setSigningOut(true);
  assert.equal(f.button(f.render(), "Sign out").props.disabled, true);
});

test("dirty Settings can keep editing or discard before signing out", () => {
  const f = fixture();
  let discarded = 0;
  f.render().props.value("general", {
    dirty: true,
    pending: false,
    save: async () => true,
    discard: () => discarded++,
  });
  f.button(f.render(), "Sign out").props.onClick();
  assert.equal(f.signedOut(), 0);
  f.button(f.render(), "Keep editing").props.onClick();
  assert.equal(f.signedOut(), 0);
  f.button(f.render(), "Sign out").props.onClick();
  f.button(f.render(), "Discard & sign out").props.onClick();
  assert.equal(discarded, 1);
  assert.equal(f.signedOut(), 1);
});

test("Save & sign out waits for a successful draft save; failed validation keeps Settings open", async () => {
  for (const succeeds of [false, true]) {
    const f = fixture();
    let saved = 0;
    f.render().props.value("general", {
      dirty: true,
      pending: false,
      save: async () => {
        saved++;

        return succeeds;
      },
      discard() {},
    });
    f.button(f.render(), "Sign out").props.onClick();
    const previousRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = () => 0;
    try {
      await f.button(f.render(), "Save & sign out").props.onClick();
    } finally {
      if (previousRaf === undefined) delete globalThis.requestAnimationFrame;
      else globalThis.requestAnimationFrame = previousRaf;
    }
    // The click starts an async save; allow its continuation to settle.
    await Promise.resolve();
    assert.equal(saved, 1);
    assert.equal(f.signedOut(), succeeds ? 1 : 0);
    assert.equal(f.closed(), 0);
  }
});
