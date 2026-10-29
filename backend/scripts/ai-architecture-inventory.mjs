import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const service = resolve(root, "backend/ai-service");
const require = createRequire(resolve(service, "package.json"));
const ts = require("typescript");
const files = readdirSync(resolve(service, "src"), { recursive: true })
  .filter((file) => file.endsWith(".ts"))
  .sort();
const inventory = [];
const routes = [];
function decorators(node) {
  return (ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map((item) => {
    const expression = item.expression;
    return ts.isCallExpression(expression)
      ? { name: expression.expression.getText(), args: expression.arguments.map((arg) => ts.isStringLiteral(arg) ? arg.text : arg.getText()) }
      : { name: expression.getText(), args: [] };
  });
}
for (const file of files) {
  const path = resolve(service, "src", file);
  const text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const record = {
    path: relative(root, path).replaceAll("\\", "/"),
    lines: text.split(/\r?\n/).length,
    sha256: createHash("sha256").update(text).digest("hex"),
    imports: [],
    declarations: [],
  };
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) record.imports.push(statement.moduleSpecifier.text);
    if ((ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name)
      record.declarations.push(statement.name.text);
    if (!ts.isClassDeclaration(statement)) continue;
    const classDecorators = decorators(statement);
    const controller = classDecorators.find((item) => item.name === "Controller");
    if (!controller) continue;
    for (const member of statement.members) {
      const metadata = decorators(member);
      const route = metadata.find((item) => ["Get", "Post", "Put", "Patch", "Delete"].includes(item.name));
      if (!route) continue;
      routes.push({
        method: route.name.toUpperCase(),
        path: "/" + [controller.args[0] ?? "", route.args[0] ?? ""].filter(Boolean).join("/"),
        controller: statement.name.text,
        handler: member.name.getText(),
        source: record.path,
        line: source.getLineAndCharacterOfPosition(member.getStart(source)).line + 1,
        authGuard: classDecorators.some((item) => item.name === "UseGuards" && item.args.includes("AuthGuard")),
        parameters: member.parameters.map((parameter) => ({ name: parameter.name.getText(), decorators: decorators(parameter) })),
      });
    }
  }
  inventory.push(record);
}
const testFiles = readdirSync(resolve(service, "test")).filter((file) => file.endsWith(".test.cjs")).sort();
const report = {
  generatedAt: new Date().toISOString(),
  sourceFiles: inventory.length,
  sourceLines: inventory.reduce((sum, file) => sum + file.lines, 0),
  endpoints: routes.length,
  files: inventory,
  routes,
  testFiles: testFiles.map((file) => ({ path: "backend/ai-service/test/" + file, sha256: createHash("sha256").update(readFileSync(resolve(service, "test", file))).digest("hex") })),
};
const output = resolve(root, "docs/testing/ai-comprehensive");
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "architecture-inventory.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ sourceFiles: report.sourceFiles, sourceLines: report.sourceLines, endpoints: report.endpoints, testFiles: testFiles.length, routes: routes.map(({ method, path }) => method + " " + path) }, null, 2));
