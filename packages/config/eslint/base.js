import js from "@eslint/js";
import ts from "typescript-eslint";
import turboPlugin from "eslint-plugin-turbo";
import globals from "globals";

/**
 * A shared ESLint configuration for the monorepo's non-React packages/apps.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const baseConfig = ts.config(
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
