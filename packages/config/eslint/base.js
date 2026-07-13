import js from "@eslint/js";
import ts from "typescript-eslint";

import turboPlugin from "eslint-plugin-turbo";
import globals from "globals";
import { defineConfig } from "eslint/config";

export const baseConfig = defineConfig(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error", // or 'warn'
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    ignores: [
      "dist/**",
      ".agents/**",
      ".wrangler/**",
      "worker-configuration.d.ts",
      "node_modules/**",
      "bin/**",
      "build/**",
      ".next/**",
      ".turbo/**",
    ],
  }
);

export default baseConfig;
