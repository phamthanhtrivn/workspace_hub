import { existsSync, readFileSync } from "node:fs";
import { registerHooks, createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

export const webRoot = fileURLToPath(new URL("../../../", import.meta.url));
export const require = createRequire(import.meta.url);
const mocks = new Map();

export function mockModule(path, source) {
  mocks.set(pathToFileURL(resolve(webRoot, path)).href, source);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let path;
    if (specifier.startsWith("@/")) path = resolve(webRoot, specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith(pathToFileURL(webRoot).href) && !context.parentURL.includes("node_modules")) {
      path = resolve(dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (path) {
      const target = [path, `${path}.ts`, `${path}.tsx`, `${path}.js`].find((candidate) => existsSync(candidate));
      if (target) return { url: pathToFileURL(target).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (mocks.has(url)) return { format: "commonjs", source: mocks.get(url), shortCircuit: true };
    if (/\.tsx?$/.test(url) && !url.includes("node_modules")) {
      return { format: "commonjs", shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      }).outputText };
    }
    return nextLoad(url, context);
  },
});
