import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".venv/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts", "test/**/*.cjs", "scripts/**/*.cjs", "*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.web } },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  {
    files: ["test/**/*.cjs", "scripts/**/*.cjs"],
    rules: {
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "require-yield": "off",
    },
  },
);
