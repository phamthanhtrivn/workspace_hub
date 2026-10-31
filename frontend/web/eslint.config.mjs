import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { sharedUiRule } from "./eslint-rules/shared-ui.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    // These Node scripts execute as CommonJS and cannot use ES module imports.
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["app/**/*.{js,jsx,ts,tsx}", "components/**/*.{js,jsx,ts,tsx}", "features/**/*.{js,jsx,ts,tsx}"],
    plugins: { workspace: { rules: { "shared-ui": sharedUiRule } } },
    rules: { "workspace/shared-ui": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".tmp/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
