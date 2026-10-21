import { fileURLToPath } from "node:url";

const normalize = (filename) => filename.replaceAll("\\", "/");
const uiRoot = normalize(fileURLToPath(new URL("../components/ui/", import.meta.url)));
const controls = new Set(["button", "input", "textarea", "select", "dialog", "details", "summary", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption"]);

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
      interaction: "Use a shared button/link for this action. A specialized interaction needs keyboard semantics; a non-action boundary needs an explicit data-ui-interaction-exception reason.",
      date: "Use CustomDatePicker or CustomDateTimePicker; Input wrappers still expose the native browser date/time widget.",
      adapter: "Use CustomSelect, Checkbox or RadioGroup. Hidden native adapters require an explicit exception reason.",
    },
  },
  create(context) {
    const filename = normalize(context.filename);
    if (filename.startsWith(uiRoot)) return {};
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (/^@base-ui\/react(?:\/|$)|^@radix-ui\/react-(?!icons)|^sweetalert2(?:\/|$)/.test(source)) context.report({ node, messageId: "vendor" });
        if (source === "react-dom" && node.specifiers.some((specifier) => specifier.type === "ImportSpecifier" && specifier.imported.name === "createPortal")) context.report({ node, messageId: "portal" });
      },
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return;
        const tag = node.name.name;
        const attribute = (name) => node.attributes.find((candidate) => candidate.type === "JSXAttribute" && candidate.name.name === name);
        const literal = (name) => attribute(name)?.value?.value;
        const nativeDateType = (expression) => expression && (
          (expression.type === "Literal" && ["date", "time", "datetime-local"].includes(expression.value)) ||
          (expression.type === "ConditionalExpression" && (nativeDateType(expression.consequent) || nativeDateType(expression.alternate)))
        );
        const typeValue = attribute("type")?.value;
        if (nativeDateType(typeValue?.type === "JSXExpressionContainer" ? typeValue.expression : typeValue)) context.report({ node, messageId: "date" });
        if (["NativeSelect", "NativeRadio", "NativeCheckbox"].includes(tag)) {
          const reason = literal("data-ui-interaction-exception");
          const hidden = /\b(sr-only|hidden)\b/.test(literal("className") || "") || attribute("hidden");
          if (!hidden || typeof reason !== "string" || reason.length < 12) context.report({ node, messageId: "adapter" });
        }
        if (["div", "span", "p", "h1", "h2", "h3", "h4", "img"].includes(tag) && attribute("onClick")) {
          const reason = literal("data-ui-interaction-exception");
          if (!(typeof reason === "string" && reason.length >= 12) &&
            !(attribute("role") && attribute("tabIndex") && attribute("onKeyDown"))) context.report({ node, messageId: "interaction" });
        }
        if (!controls.has(tag)) return;
        const filePicker = tag === "input" && literal("type") === "file" && (attribute("hidden") || /\bhidden\b/.test(literal("className") || ""));
        if (filePicker) return;
        context.report({ node, messageId: "control", data: { tag } });
      },
    };
  },
};
