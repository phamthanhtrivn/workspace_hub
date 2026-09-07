import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");

const roots = ["features/project", "app/(workspace)/projects"];
const extensions = new Set([".ts", ".tsx"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return extensions.has(path.extname(entry.name)) ? [target] : [];
  });
}

const files = roots
  .flatMap(walk)
  .filter((file) => !/\.(?:test|spec)\.[tj]sx?$/.test(file));
const usedIds = new Set();
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(
    /(?:formatMessage\(\s*\{\s*id|\blabelId)\s*:\s*["']([^"']+)["']/g,
  )) {
    usedIds.add(match[1]);
  }
}

function definedIds(locale) {
  const source = fs.readFileSync(`features/i18n/messages/${locale}.ts`, "utf8");
  return new Set(
    [...source.matchAll(/^\s*["']([^"']+)["']\s*:/gm)].map(
      (match) => match[1],
    ),
  );
}

let failed = false;
for (const locale of ["vi", "en"]) {
  const defined = definedIds(locale);
  const missing = [...usedIds].filter((id) => !defined.has(id)).sort();
  if (missing.length) {
    failed = true;
    console.error(`${locale}: missing ${missing.length} message IDs`);
    missing.forEach((id) => console.error(`  ${id}`));
  }
}

const uiAttributes = new Set([
  "title",
  "aria-label",
  "placeholder",
  "alt",
  "label",
  "description",
  "emptyMessage",
  "buttonLabel",
]);
const uiPropertyNames = new Set([
  "label",
  "title",
  "description",
  "confirmText",
  "cancelText",
  "placeholder",
  "emptyMessage",
]);
const violations = [];
const hasWords = (value) => /[A-Za-zÀ-ỹ]{2}/u.test(value);

function visit(node, file, parent) {
  if (!node || typeof node !== "object") return;
  if (node.type === "JSXText" && hasWords(node.value.trim())) {
    violations.push(`${file}:${node.loc.start.line} raw JSX text: ${node.value.trim()}`);
  }
  if (
    node.type === "JSXAttribute" &&
    node.name?.type === "JSXIdentifier" &&
    uiAttributes.has(node.name.name) &&
    node.value?.type === "StringLiteral" &&
    hasWords(node.value.value)
  ) {
    violations.push(
      `${file}:${node.loc.start.line} raw ${node.name.name}: ${node.value.value}`,
    );
  }
  if (
    node.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" &&
    node.callee.object?.type === "Identifier" &&
    node.callee.object.name === "toast" &&
    ["StringLiteral", "TemplateLiteral"].includes(node.arguments[0]?.type)
  ) {
    violations.push(`${file}:${node.loc.start.line} raw toast message`);
  }
  if (
    node.type === "ObjectProperty" &&
    node.key?.type === "Identifier" &&
    uiPropertyNames.has(node.key.name) &&
    node.value?.type === "StringLiteral" &&
    hasWords(node.value.value) &&
    !/^(?:app|project)\./.test(node.value.value)
  ) {
    violations.push(
      `${file}:${node.loc.start.line} raw ${node.key.name}: ${node.value.value}`,
    );
  }
  if (
    node.type === "NewExpression" &&
    node.callee?.type === "Identifier" &&
    node.callee.name === "Error" &&
    node.arguments[0]?.type === "StringLiteral" &&
    hasWords(node.arguments[0].value) &&
    !/^(?:app|project)\./.test(node.arguments[0].value)
  ) {
    violations.push(`${file}:${node.loc.start.line} raw error message`);
  }
  if (node.type === "JSXExpressionContainer" && parent?.type !== "JSXAttribute") {
    const expression = node.expression;
    const candidates =
      expression?.type === "ConditionalExpression"
        ? [expression.consequent, expression.alternate]
        : expression?.type === "LogicalExpression"
          ? [expression.right]
          : [expression];
    for (const candidate of candidates) {
      if (
        candidate?.type === "StringLiteral" &&
        hasWords(candidate.value) &&
        !/^(?:app|project)\./.test(candidate.value)
      ) {
        violations.push(
          `${file}:${candidate.loc.start.line} raw JSX expression: ${candidate.value}`,
        );
      }
    }
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value))
      value.forEach((child) => visit(child, file, node));
    else if (value && typeof value === "object" && value.type)
      visit(value, file, node);
  }
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  if (/['"](?:vi-VN|en-GB)['"]/.test(source)) {
    violations.push(`${file}: hardcoded locale`);
  }
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  visit(ast, file);
}

if (violations.length) {
  failed = true;
  console.error(`Project UI contains ${violations.length} raw user-facing strings:`);
  violations.forEach((violation) => console.error(`  ${violation}`));
}

if (failed) process.exitCode = 1;
else
  console.log(
    `Project i18n catalogs contain all ${usedIds.size} statically referenced message IDs.`,
  );
