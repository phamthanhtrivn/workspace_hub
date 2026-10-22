import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function chatHarness(answer) {
  const states = [],
    exports = {};
  const react = {
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useEffect: () => {},
    useState: (value) => {
      const index = states.length;
      states.push(value);
      return [
        value,
        (next) => {
          states[index] =
            typeof next === "function" ? next(states[index]) : next;
        },
      ];
    },
  };
  let timeout;
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(
        new URL("../features/ai/hooks/use-notebook.ts", import.meta.url),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    {
      exports,
      AbortController,
      crypto: globalThis.crypto,
      setTimeout: (_fn, ms) => {
        timeout = ms;
        return 1;
      },
      clearTimeout: () => {},
      require: (name) =>
        name === "react"
          ? react
          : name === "../api/notebooks.api"
            ? { notebooksApi: { answer, cancel: async () => {} } }
            : {},
    },
  );
  return {
    chat: exports.useNotebookChat("notebook", async () => {}),
    states,
    timeout: () => timeout,
  };
}

test("a length error preserves the streamed draft without marking it completed", async () => {
  const harness = chatHarness(
    async (_id, _q, _sources, _request, _signal, emit) => {
      emit({ event: "delta", data: { text: "Received portion" } });
      throw new Error("Output limit reached");
    },
  );
  await harness.chat.ask("question", [{ id: "source", revision: "r1" }]);
  assert.equal(harness.states[0].text, "Received portion");
  assert.equal(harness.states[2], false);
  assert.equal(harness.states[3], "Output limit reached");
  assert.equal(harness.timeout(), 150000);
});

test("empty failures leave no duplicate question; successful requests clear the draft", async () => {
  for (const failing of [true, false]) {
    const harness = chatHarness(
      async (_id, _q, _sources, _request, _signal, emit) => {
        if (failing) throw new Error("No response");
        emit({ event: "delta", data: { text: "Completed" } });
      },
    );
    await harness.chat.ask("question", [{ id: "source", revision: "r1" }]);
    assert.equal(harness.states[0], null);
    assert.equal(harness.states[2], false);
  }
});
