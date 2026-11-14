const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const repositoryRoot = path.resolve(__dirname, "../..");
const projectRequire = Module.createRequire(path.resolve(process.env.WORKSPACEHUB_TEST_PROJECT || process.cwd(), "package.json"));
const ts = projectRequire("typescript");
const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2023,
  jsx: ts.JsxEmit.ReactJSX,
  esModuleInterop: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
};

function compile(source, filename) {
  return ts.transpileModule(source, { fileName: filename, compilerOptions }).outputText;
}

/** A per-fixture module cache keeps mocked imports separate without patching global require. */
function createSourceLoader(projectRoot) {
  function load(relative, stubs = {}, cache = new Map()) {
    const filename = path.resolve(projectRoot, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const target = new Module(filename, module);
    target.filename = filename;
    target.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, target);
    const nativeRequire = target.require.bind(target);
    target.require = (request) => {
      if (Object.hasOwn(stubs, request)) return stubs[request];
      if (request.endsWith(".css")) return {};
      if (request.startsWith(".") || request.startsWith("@/")) {
        const base = request.startsWith("@/") ? path.resolve(projectRoot, request.slice(2)) : path.resolve(path.dirname(filename), request);
        const dependency = [base, base + ".ts", base + ".tsx", path.join(base, "index.ts"), path.join(base, "index.tsx")].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (dependency && /\.tsx?$/.test(dependency)) return load(path.relative(projectRoot, dependency), stubs, cache);
      }
      return nativeRequire(request);
    };
    target._compile(compile(fs.readFileSync(filename, "utf8"), filename), filename);
    return target.exports;
  }
  return load;
}

module.exports = { compile, createSourceLoader, repositoryRoot };
