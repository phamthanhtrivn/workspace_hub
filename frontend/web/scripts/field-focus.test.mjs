import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Search, Lock } from "lucide-react";
import ts from "typescript";
import { compile } from "@tailwindcss/node";
import postcss from "postcss";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const cache = new Map();
function loadSource(url) {
  if (cache.has(url.href)) return cache.get(url.href);
  const exports = {};
  cache.set(url.href, exports);
  const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: name => {
      if (!name.startsWith(".") && !name.startsWith("@/")) return require(name);
      const base = name.startsWith("@/") ? new URL(`../${name.slice(2)}`, import.meta.url) : new URL(name, url);
      const resolved = [".tsx", ".ts"].map(extension => new URL(base.href + extension)).find(existsSync);
      assert.ok(resolved, `Cannot resolve ${name}`);
      return loadSource(resolved);
    },
  });
  return exports;
}
const load = filename => loadSource(new URL(`../${filename}`, import.meta.url));
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const inputTag = html => html.match(/<input\b[^>]*>/)?.[0] ?? "";
const hasClass = (tag, name) => (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/).includes(name);

for (const [file, name, tag] of [["input", "Input", "input"], ["textarea", "Textarea", "textarea"], ["native-select", "NativeSelect", "select"]]) {
  test(`${name}: standalone and unstyled fields retain focus; delegation preserves DOM attributes`, () => {
    const Component = load(`components/ui/${file}.tsx`)[name];
    for (const unstyled of [false, true]) {
      const self = render(Component, { unstyled, id: "field", name: "field", disabled: true, "aria-invalid": true });
      assert.ok(hasClass(self.match(new RegExp(`<${tag}\\b[^>]*>`))[0], "field-focus"));
      const delegated = render(Component, { unstyled, focusMode: "container", id: "field", name: "field", disabled: true, "aria-invalid": true });
      assert.ok(hasClass(delegated.match(new RegExp(`<${tag}\\b[^>]*>`))[0], "field-focus-content"));
      assert.match(delegated, /id="field"/);
      assert.match(delegated, /name="field"/);
      assert.match(delegated, /disabled=""/);
      assert.match(delegated, /aria-invalid="true"/);
      assert.doesNotMatch(delegated, /focusMode=|unstyled=/i);
    }
  });
}

test("auth password: the whole rounded frame owns focus and disabled also locks the eye button", () => {
  const { default: InputField } = load("components/common/input-field.tsx");
  const html = render(InputField, { id: "confirm", type: "password", variant: "auth", icon: Lock, rightIcon: "Show", disabled: true, error: "Passwords differ", autoComplete: "new-password", "aria-describedby": "hint" });
  assert.match(html, /data-invalid="true"[^>]*field-focus-container/);
  assert.match(html, /rounded-2xl/);
  assert.ok(hasClass(inputTag(html), "field-focus-content"));
  assert.ok(!hasClass(inputTag(html), "field-focus"));
  assert.match(inputTag(html), /aria-describedby="hint confirm-error"/);
  assert.match(inputTag(html), /autoComplete="new-password"/i);
  assert.match(html, /<button\b[^>]*disabled=""/);
  assert.match(html, /id="confirm-error"/);
});

test("meeting fields: ARIA invalid state reaches the border owner and remains on the control", () => {
  const { MeetingInput, MeetingTextarea } = load("features/meeting/components/ui/meeting-form-controls.tsx");
  const html = render(MeetingInput, { icon: Search, "aria-invalid": true, "aria-label": "Search participants", disabled: true });
  assert.match(html, /<span data-invalid="true"[^>]*field-focus-container/);
  assert.ok(hasClass(inputTag(html), "field-focus-content"));
  assert.match(inputTag(html), /aria-invalid="true"/);
  assert.match(inputTag(html), /disabled=""/);
  assert.match(render(MeetingTextarea, { "aria-invalid": true, "aria-label": "Message" }), /aria-invalid="true"/);
});

test("search and password auxiliary actions keep their own names and remain in the field focus group", () => {
  const { SearchInput } = load("components/ui/search-input.tsx");
  const { default: PasswordInput } = load("features/user-setting/components/password-input.tsx");
  const search = render(SearchInput, { value: "report", onChange() {}, onClear() {}, "aria-label": "Find documents", disabled: true });
  assert.match(search, /field-focus-group/);
  assert.match(search, /aria-label="Clear search"/);
  assert.match(search, /<button\b[^>]*disabled=""/);
  const password = render(PasswordInput, { id: "password", label: "New password", value: "", onChange() {}, error: "Too short" });
  assert.match(password, /field-focus-group/);
  assert.match(password, /aria-label="Show password"/);
  assert.match(inputTag(password), /aria-invalid="true"/);
});

test("select triggers delegate focus without leaking props or losing invalid state", () => {
  const { CustomSelect } = load("components/ui/custom/custom-select.tsx");
  const props = { value: "one", options: [{ value: "one", label: "Option one" }], onChange() {}, ariaLabel: "Choose option", invalid: true };
  const self = render(CustomSelect, props);
  assert.match(self, /field-focus-open/);
  assert.match(self, /aria-invalid="true"/);
  const delegated = render(CustomSelect, { ...props, focusMode: "container" });
  assert.match(delegated, /field-focus-content/);
  assert.doesNotMatch(delegated, /field-focus-open|focusMode=/);
});

test("combobox inputs retain their accessible input contract in either focus mode", () => {
  const { Combobox, ComboboxInput } = load("components/ui/combobox.tsx");
  for (const mode of ["self", "container"]) {
    const html = renderToStaticMarkup(createElement(Combobox, {}, createElement(ComboboxInput, { focusMode: mode, "aria-label": "Share email", "aria-invalid": true, disabled: true })));
    assert.ok(hasClass(inputTag(html), mode === "self" ? "field-focus" : "field-focus-content"));
    assert.match(inputTag(html), /aria-label="Share email"/);
    assert.match(inputTag(html), /aria-invalid="true"/);
    assert.match(inputTag(html), /disabled=""/);
    assert.doesNotMatch(html, /focusMode=/);
  }
});

test("meeting device field keeps open-state focus on its outer frame and disables unavailable devices", () => {
  const { MeetingDeviceSelect } = load("features/meeting/components/common/meeting-device-select.tsx");
  const props = { id: "camera", label: "Camera", value: "camera-1", devices: [{ deviceId: "camera-1", label: "Built-in camera" }], icon: Search, onChange() {} };
  const html = render(MeetingDeviceSelect, props);
  assert.match(html, /field-focus-container field-focus-open/);
  assert.match(html, /<button\b[^>]*field-focus-content/);
  assert.match(html, /aria-label="Camera"/);
  const unavailable = render(MeetingDeviceSelect, { ...props, devices: [] });
  assert.match(unavailable, /data-state="closed"/);
  assert.match(unavailable, /<button\b[^>]*disabled=""/);
});

test("required date triggers retain validation and open-state focus without decorating the hidden input", () => {
  const { CustomDatePicker } = load("components/ui/custom/custom-date-picker.tsx");
  const html = render(CustomDatePicker, { id: "dob", name: "dob", value: "", onChange() {}, ariaLabel: "Date of birth", invalid: true, required: true });
  assert.match(html, /field-focus-open/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(inputTag(html), /required=""/);
  assert.ok(!hasClass(inputTag(html), "field-focus"));
});

test("note editor: invalid state belongs to the frame while formatting buttons remain keyboard targets", () => {
  const { default: RichTextTextarea } = load("features/chat/components/input/rich-text-textarea.tsx");
  const html = render(RichTextTextarea, { value: "Note", setValue() {}, "aria-invalid": true });
  assert.match(html, /data-invalid="true"[^>]*field-focus-container/);
  assert.match(html, /<textarea\b[^>]*field-focus-content/);
  assert.match(html, /aria-label="Bold"/);
  assert.match(html, /aria-label="Message content"/);
});

test("compiled focus CSS keeps one thin ring, error priority, geometry and forced-color fallback", async () => {
  const sourceUrl = new URL("../app/globals.css", import.meta.url);
  const compiler = await compile(readFileSync(sourceUrl, "utf8"), { base: fileURLToPath(new URL("../app/", import.meta.url)), from: fileURLToPath(sourceUrl), onDependency() {} });
  const css = postcss.parse(compiler.build([]));
  const rules = [];
  css.walkRules(rule => rules.push(rule));
  const focus = rules.find(rule => rule.selector.includes(".field-focus:focus") && rule.nodes.some(node => node.prop === "box-shadow"));
  assert.ok(focus);
  for (const selector of [".field-focus-container:focus-within", ".field-focus-group:focus-within > .field-focus", '.field-focus-open[data-state="open"]']) assert.ok(focus.selector.includes(selector));
  assert.ok(focus.nodes.some(node => node.prop === "--tw-ring-shadow" && node.value.includes("2px")));
  assert.ok(focus.nodes.some(node => node.prop === "--tw-ring-color" && node.value === "var(--ring)"));
  assert.ok(!focus.nodes.some(node => /^(?:width|height|padding|margin|border-width)$/.test(node.prop)));
  const invalid = rules.find(rule => rule.selector.includes('.field-focus[aria-invalid="true"]'));
  assert.ok(rules.indexOf(invalid) > rules.indexOf(focus), "Invalid border must win when focus and error coexist");
  assert.ok(invalid.nodes.some(node => node.prop === "border-color" && node.value === "var(--destructive-outline)"));
  assert.ok(!invalid.nodes.some(node => node.prop === "--tw-ring-color"), "Error must not replace the focus indicator");
  const content = rules.find(rule => rule.selector.includes(".field-focus-content:focus"));
  assert.ok(content.nodes.some(node => node.prop === "box-shadow" && node.value === "none"));
  assert.ok(rules.some(rule => rule.parent.type === "atrule" && rule.parent.params === "(forced-colors: active)" && rule.nodes.some(node => node.prop === "outline" && node.value.includes("Highlight"))));
});

test("feature fields do not reintroduce local border/ring/outline focus overrides", () => {
  const violations = [];
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
      if (entry.isDirectory()) { scan(url); continue; }
      if (!entry.name.endsWith(".tsx")) continue;
      const source = ts.createSourceFile(fileURLToPath(url), readFileSync(url, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      function visit(node) {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && /(?:Input|Textarea|Select|DatePicker|TimePicker|DateField)$/.test(node.tagName.getText(source))) {
          for (const attribute of node.attributes.properties) {
            if (ts.isJsxAttribute(attribute) && ["className", "containerClassName", "triggerClassName"].includes(attribute.name.getText(source)) && attribute.initializer && /(?:focus(?:-within|-visible)?:|data-\[state=open\]:)(?:border|ring|outline)/.test(attribute.initializer.getText(source))) violations.push(`${url.pathname}:${source.getLineAndCharacterOfPosition(attribute.getStart(source)).line + 1}`);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  for (const directory of ["components/", "features/", "app/"]) scan(new URL(`../${directory}`, import.meta.url));
  assert.deepEqual(violations, []);
});
