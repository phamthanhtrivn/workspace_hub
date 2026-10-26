import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
function loadMotionComponent(filename) {
  return loadSource(new URL(`../features/landing/components/motion/${filename}`, import.meta.url));
}

function loadSource(url, mocks = {}, globals = {}, sourceCache = cache) {
  if (sourceCache.has(url.href)) return sourceCache.get(url.href);
  const exports = {};
  sourceCache.set(url.href, exports);
  const { outputText } = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  vm.runInNewContext(outputText, { exports, ...globals, require: (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (!name.startsWith(".")) return require(name);
    const base = new URL(name, url);
    const resolved = [".tsx", ".ts"].map(extension => new URL(base.href + extension)).find(existsSync);
    assert.ok(resolved, `Cannot resolve ${name}`);
    return loadSource(resolved, mocks, globals, sourceCache);
  } });
  return exports;
}

const { LandingMotionProvider } = loadMotionComponent("landing-motion-provider.tsx");
const { FadeIn, FadeInStagger } = loadMotionComponent("fade-in.tsx");
const { SlideIn } = loadMotionComponent("slide-in.tsx");
const { LandingHeroMotion } = loadMotionComponent("landing-hero-motion.tsx");
const render = (children) => renderToStaticMarkup(createElement(LandingMotionProvider, null, children));
const assertVisible = (html) => assert.doesNotMatch(html, /opacity:\s*0|visibility:\s*hidden|display:\s*none|translate[XY]?\(/);

function entranceFixture({ inView = false, reducedMotion = false, mobile = false, hash = "", focused = false, anchorInside = true, motionProps = {} } = {}) {
  const react = require("react");
  const motion = require("framer-motion");
  const controller = motion.animationControls();
  const detachController = controller.mount();
  const sets = [];
  const starts = [];
  const frames = new Map();
  const refs = [];
  const preferences = { ready: true, mobile, reducedMotion };
  let refIndex = 0;
  let frameId = 0;
  let setup;
  let cleanup;
  const activeElement = {};
  const anchor = { contains: (candidate) => !anchorInside && candidate === element };
  const element = {
    contains: (candidate) => (focused && candidate === activeElement) || (anchorInside && candidate === anchor),
    getBoundingClientRect: () => ({ top: 0, bottom: 100 }),
  };
  const controls = {
    ...controller,
    set: (definition) => { sets.push(definition); controller.set(definition); },
    start: (definition) => { starts.push(definition); return controller.start(definition); },
  };
  const { RevealMotion: FixtureRevealMotion } = loadSource(
    new URL("../features/landing/components/motion/reveal-motion.tsx", import.meta.url),
    {
      react: { ...react,
        useContext: () => null,
        useRef: (initial) => refs[refIndex++] ??= { current: initial === null ? element : initial },
        useEffect: (effect) => { setup = effect; },
      },
      "framer-motion": { ...motion, useAnimationControls: () => controls, useInView: () => inView },
      "./landing-motion-provider": { useLandingMotionPreferences: () => preferences },
    },
    {
      window: {
        requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
        cancelAnimationFrame: (id) => frames.delete(id),
        location: { hash }, innerHeight: 800,
      },
      document: {
        activeElement,
        getElementById: () => hash ? anchor : null,
      },
    },
    new Map(),
  );

  function update(next = {}) {
    inView = next.inView ?? inView;
    preferences.reducedMotion = next.reducedMotion ?? preferences.reducedMotion;
    refIndex = 0;
    FixtureRevealMotion({ children: "Scroll to reveal", ...motionProps });
    cleanup?.();
    cleanup = setup();
  }

  return {
    sets, starts, update,
    get pendingFrames() { return frames.size; },
    flushFrame() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
    },
    dispose() { detachController(); cleanup?.(); },
  };
}

test("viewport content waits hidden until scrolling into view and reveals only once", () => {
  const fixture = entranceFixture();
  try {
    fixture.update();
    assert.equal(fixture.sets.at(-1).opacity, 0);
    fixture.flushFrame();
    assert.equal(fixture.starts.length, 0);
    fixture.update({ inView: true });
    fixture.flushFrame();
    assert.equal(fixture.starts.length, 1);
    fixture.update({ inView: false });
    fixture.update({ inView: true });
    fixture.flushFrame();
    assert.equal(fixture.starts.length, 1);
    assert.equal(fixture.sets.at(-1).opacity, 1);
  } finally { fixture.dispose(); }
});

test("reduced motion reveals waiting content immediately and settles an active entrance", () => {
  const fixture = entranceFixture({ motionProps: SlideIn({ from: "right", children: "Preview" }).props });
  try {
    fixture.update();
    fixture.update({ reducedMotion: true });
    assert.equal(fixture.sets.at(-1).opacity, 1);
    assert.equal(fixture.sets.at(-1).x, 0);
    fixture.update({ reducedMotion: false });
    assert.equal(fixture.sets.at(-1).opacity, 0);
    fixture.update({ inView: true });
    fixture.flushFrame();
    assert.equal(fixture.starts.length, 1);
    fixture.update({ reducedMotion: true });
    assert.equal(fixture.sets.at(-1).opacity, 1);
    assert.equal(fixture.sets.at(-1).x, 0);
    fixture.update({ reducedMotion: false });
    fixture.flushFrame();
    assert.equal(fixture.starts.length, 1);
  } finally { fixture.dispose(); }
});

test("anchor targets and focused content stay visible before viewport observation catches up", () => {
  for (const options of [{ hash: "#product" }, { focused: true }]) {
    const fixture = entranceFixture(options);
    try {
      fixture.update();
      fixture.flushFrame();
      assert.equal(fixture.sets.at(-1).opacity, 1);
      assert.equal(fixture.starts.length, 0);
    } finally { fixture.dispose(); }
  }
});

test("a section anchor does not consume entrances for rows that have not been scrolled into view", () => {
  const fixture = entranceFixture({ hash: "#workflow", anchorInside: false });
  try {
    fixture.update();
    fixture.flushFrame();
    assert.equal(fixture.sets.at(-1).opacity, 0);
    assert.equal(fixture.starts.length, 0);
    fixture.update({ inView: true });
    fixture.flushFrame();
    assert.equal(fixture.starts.length, 1);
  } finally { fixture.dispose(); }
});

test("mount and viewport entrances server-render readable content without browser globals", () => {
  for (const trigger of ["mount", "in-view"]) {
    const cases = [
      [FadeIn, {}],
      ...["left", "right", "top", "bottom"].map(from => [SlideIn, { from }]),
    ];
    for (const [component, props] of cases) {
      const html = render(createElement(component, { ...props, trigger }, createElement("p", null, "Read before hydration")));
      assert.match(html, /<p>Read before hydration<\/p>/);
      assertVisible(html);
    }
  }
});

test("slides enter from all four edges and settle on the original layout position", () => {
  for (const [from, axis, sign] of [["left", "x", -1], ["right", "x", 1], ["top", "y", -1], ["bottom", "y", 1]]) {
    const fixture = entranceFixture({ motionProps: SlideIn({ from, children: "Preview" }).props });
    try {
      fixture.update();
      assert.equal(Math.sign(fixture.sets.at(-1)[axis]), sign);
      fixture.update({ inView: true });
      fixture.flushFrame();
      const entrance = fixture.starts[0];
      assert.equal(Math.sign(entrance[axis][0]), sign);
      assert.equal(entrance.x.at(-1), 0);
      assert.equal(entrance.y.at(-1), 0);
      assert.ok(entrance.transition.opacity.duration < entrance.transition.duration);
    } finally { fixture.dispose(); }
  }
});

test("fade-in changes opacity gradually without sliding the content", () => {
  const fixture = entranceFixture({ inView: true, motionProps: FadeIn({ children: "Description" }).props });
  try {
    fixture.update();
    fixture.flushFrame();
    const entrance = fixture.starts[0];
    assert.ok(entrance.x.every(offset => offset === 0));
    assert.ok(entrance.y.every(offset => offset === 0));
    assert.equal(entrance.opacity[0], 0);
    assert.equal(entrance.opacity.at(-1), 1);
    assert.equal(entrance.transition.opacity.duration, entrance.transition.duration);
  } finally { fixture.dispose(); }
});

test("hero preserves its heading, description and working signup link before JavaScript", () => {
  const html = render(createElement(LandingHeroMotion, {
    heading: createElement("h1", { id: "hero-heading" }, "Your work, connected."),
    description: createElement("p", null, "Projects and conversations together."),
    actions: createElement("a", { href: "/register" }, "Get Started"),
  }));
  assert.match(html, /<h1 id="hero-heading">Your work, connected\.<\/h1>/);
  assert.match(html, /<a href="\/register">Get Started<\/a>/);
  assert.ok(html.indexOf("<h1") < html.indexOf("<p"));
  assert.ok(html.indexOf("<p") < html.indexOf("<a"));
  assertVisible(html);
});

test("stagger grouping adds no layout container between a grid and its children", () => {
  const html = render(createElement("section", { className: "grid" },
    createElement(FadeInStagger, null,
      createElement(FadeIn, { key: "heading", className: "heading" }, "FAQ"),
      createElement(FadeIn, { key: "questions", className: "questions" }, "Questions"),
    ),
  ));
  assert.equal(html, '<section class="grid"><div class="heading">FAQ</div><div class="questions">Questions</div></section>');
});

test("unmount safely cancels pending and started entrances after Framer detaches its controller", () => {
  for (const startFrame of [false, true]) {
    const fixture = entranceFixture({ inView: true });
    fixture.update();
    assert.equal(fixture.pendingFrames, 1);
    if (startFrame) fixture.flushFrame();
    // Framer mounts its controller in a layout effect; it detaches before passive cleanup.
    assert.doesNotThrow(() => fixture.dispose());
    assert.equal(fixture.pendingFrames, 0);
  }
});
