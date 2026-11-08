import eslint from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "eslint.config.mjs"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: {
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto",
          printWidth: 80,
          tabWidth: 2,
          singleQuote: false,
          trailingComma: "all",
        },
      ],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
      ],
    },
  },
);
