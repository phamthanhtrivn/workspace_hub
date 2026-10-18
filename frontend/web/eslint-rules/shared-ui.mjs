import { fileURLToPath } from "node:url";

const normalize = (filename) => filename.replaceAll("\\", "/");
const uiRoot = normalize(fileURLToPath(new URL("../components/ui/", import.meta.url)));
const controls = new Set(["button", "input", "textarea", "select", "dialog", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption"]);

/** Keeps control implementations in the owned UI layer, without policing
 * semantic layout/content or third-party generated DOM. */
export const sharedUiRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      control: "Use the shared UI component for <{{tag}}> instead of implementing another base control.",
      vendor: "Import the owned components/ui adapter instead of a vendor primitive.",
      portal: "Use the shared UI portal, Dialog, Sheet or popup adapter.",
    },
  },
  create(context) {
    const filename = normalize(context.filename);
    if (filename.startsWith(uiRoot)) return {};
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (/^@base-ui\/react(?:\/|$)|^@radix-ui\/react-(?!icons)/.test(source)) context.report({ node, messageId: "vendor" });
        if (source === "react-dom" && node.specifiers.some((specifier) => specifier.type === "ImportSpecifier" && specifier.imported.name === "createPortal")) context.report({ node, messageId: "portal" });
      },
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || !controls.has(node.name.name)) return;
        const tag = node.name.name;
        const attribute = (name) => node.attributes.find((candidate) => candidate.type === "JSXAttribute" && candidate.name.name === name);
        const literal = (name) => attribute(name)?.value?.value;
        const filePicker = tag === "input" && literal("type") === "file" && (attribute("hidden") || /\bhidden\b/.test(literal("className") || ""));
        const otpCell = tag === "input" && filename.endsWith("/components/common/otp-input.tsx");
        if (filePicker || otpCell) return;
        context.report({ node, messageId: "control", data: { tag } });
      },
    };
  },
};
