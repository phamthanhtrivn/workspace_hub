import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const excluded = new Set(["node_modules", "dist", ".next", "target", "coverage", ".venv", "__pycache__"]);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return excluded.has(entry.name) ? [] : walk(file);
    return /\.(spec|test)\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [file] : [];
  });
}

export function discoverTests(project, suite, repositoryRoot) {
  const system = suite === "system" || (suite === "integration" && project === repositoryRoot);
  const folders = system ? [join(repositoryRoot, "tests/system")]
    : suite === "integration" ? [join(project, "tests/integration")]
    : ["src", "features", "components", "hooks", "lib", "store", "app"].map(folder => join(project, folder));
  return [...new Set(folders.flatMap(walk))].filter(file => {
    if (suite === "system") return !file.includes(".integration.test.");
    if (system) return file.includes(".integration.test.");
    return true;
  }).sort();
}
