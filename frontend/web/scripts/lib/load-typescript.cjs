const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

exports.loadTypeScript = function loadTypeScript(filename, dependencies = {}, globals = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, experimentalDecorators: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, console, Date, URL, setTimeout, clearTimeout,
    require: name => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith('.')) {
        const candidate = path.resolve(path.dirname(filename), name);
        for (const extension of ['.ts', '.tsx']) if (fs.existsSync(candidate + extension)) return loadTypeScript(candidate + extension, dependencies, globals);
      }
      return require(name);
    }, ...globals,
  }, { filename });
  return module.exports;
};
