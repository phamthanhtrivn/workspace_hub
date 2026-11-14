const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { compile, repositoryRoot } = require("./typescript.cjs");

// Fast tests must not read a developer's private .env or connect to its database.
process.env.NODE_ENV = "test";
process.env.DOTENV_CONFIG_PATH = path.join(__dirname, "no-private-env");
process.env.DATABASE_URL = "postgresql://unit:unit@127.0.0.1:1/workspacehub_unit";
process.env.REDIS_URL = "redis://127.0.0.1:1/15";

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (target, filename) => target._compile(compile(fs.readFileSync(filename, "utf8"), filename), filename);
}
require.extensions[".css"] = target => { target.exports = {}; };
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveTestAlias(request, parent, ...options) {
  const target = request.startsWith("@/") ? path.resolve(repositoryRoot, "frontend/web", request.slice(2)) : request;
  return resolveFilename.call(this, target, parent, ...options);
};
