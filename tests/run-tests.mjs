import { resolve, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { discoverTests } from "./support/discovery.mjs";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const options = process.argv.slice(2);
const value = name => options.includes(name) ? options[options.indexOf(name) + 1] : undefined;
const project = resolve(value("--project") || process.cwd());
const suite = value("--suite") || "unit";
const projects = ["backend/ai-service/api", "backend/calendar-service", "backend/communication-service", "backend/document-service", "backend/notification-service", "backend/project-service", "frontend/web"];

if (!new Set(["unit", "integration", "system"]).has(suite)) throw new Error(`Unknown test suite: ${suite}`);
if (options.includes("--all")) {
  for (const directory of projects) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--project", resolve(root, directory), "--suite", suite, ...(options.includes("--list") ? ["--list"] : [])], { cwd: root, stdio: "inherit", windowsHide: true });
    if (result.status !== 0) process.exit(result.status || 1);
  }
} else {
  const files = discoverTests(project, suite, root).filter(file => !value("--match") || file.includes(value("--match")));
  if (options.includes("--list")) {
    console.log(`${relative(root, project) || "."}: ${files.length} ${suite} test files`);
    files.forEach(file => console.log(relative(root, file)));
  } else if (!files.length) {
    console.log(`No ${suite} tests in ${relative(root, project)}.`);
  } else {
    const result = spawnSync(process.execPath, ["--require", join(root, "tests/support/register.cjs"), "--test", "--test-reporter=spec", "--test-concurrency=2", `--test-timeout=${suite === "integration" ? 900000 : 120000}`, ...files], {
      cwd: project, stdio: "inherit", windowsHide: true,
      env: { ...process.env, WORKSPACEHUB_TEST_PROJECT: project === root ? resolve(root, "backend/project-service") : project },
    });
    if (result.error) throw result.error;
    process.exitCode = result.status || (result.signal ? 1 : 0);
  }
}
